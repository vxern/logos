import { Locale } from "../../../../../constants/languages";
import { mention, trim } from "../../../../../formatting";
import { Client } from "../../../../client";
import { Modal, ModalComposer } from "../../../../components/modal-composer";
import { Guild } from "../../../../database/guild";
import { Ticket, TicketFormData, TicketType } from "../../../../database/ticket";
import { Configurations } from "../../../../services/prompts/service";

async function handleOpenTicket(client: Client, interaction: Logos.Interaction): Promise<void> {
	const { locale, guildLocale } = interaction;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.tickets;
	if (configuration === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const member = interaction.member;
	if (member === undefined) {
		return;
	}

	const crossesRateLimit = Guild.crossesRateLimit(
		await Ticket.getAll(client, { where: { authorId: interaction.user.id.toString() } }),
		configuration.rateLimit ?? constants.defaults.TICKET_RATE_LIMIT,
	);
	if (!crossesRateLimit) {
		const strings = {
			title: client.localise("ticket.strings.tooMany.title", locale)(),
			description: client.localise("ticket.strings.tooMany.description", locale)(),
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
				},
			],
		});
		return;
	}

	const composer = new TicketComposer(client, { interaction });

	composer.onSubmit(
		async (
			submission: Logos.Interaction,
			{ locale }: Logos.InteractionLocaleData,
			{ formData }: { formData: TicketFormData },
		) => {
			await client.postponeReply(submission);

			const result = await openTicket(
				client,
				configuration,
				formData,
				[guild, submission.user, member],
				configuration.categoryId,
				"standalone",
				{ guildLocale },
			);
			if (typeof result === "string") {
				return result;
			}

			const strings = {
				title: client.localise("ticket.strings.sent.title", locale)(),
				description: client.localise("ticket.strings.sent.description", locale)(),
			};

			client.editReply(submission, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colours.lightGreen,
					},
				],
			});
		},
	);

	await composer.open();
}

// TODO(vxern): This number of parameters is insanity, this function is way too large.
async function openTicket(
	client: Client,
	configuration: NonNullable<Configurations["tickets"] | Configurations["verification"]>,
	answers: Ticket["answers"],
	[guild, user, member]: [Logos.Guild, Logos.User, Logos.Member],
	categoryId: string,
	type: TicketType,
	{ guildLocale }: { guildLocale: Locale },
): Promise<Ticket | undefined> {
	const categoryChannel = client.entities.channels.get(BigInt(categoryId));
	if (categoryChannel === undefined) {
		return undefined;
	}

	const ticketService = client.getPromptService(guild.id, { type: "tickets" });
	if (ticketService === undefined) {
		return undefined;
	}

	const strings = {
		inquiry: client.localise("entry.verification.inquiry.inquiry", guildLocale)(),
	};

	const channel = await client.bot.helpers
		.createChannel(guild.id, {
			parentId: categoryId,
			name: trim(
				`${user.username}${constants.special.sigils.channelSeparator}${
					type === "standalone" ? answers.topic : strings.inquiry
				}`,
				100,
			),
			permissionOverwrites: [
				...categoryChannel.permissionOverwrites,
				{ type: Discord.OverwriteTypes.Member, id: user.id, allow: ["VIEW_CHANNEL"] },
			],
			topic: answers.topic,
		})
		.catch(() => {
			client.log.warn("Could not create a channel for ticket.");
			return undefined;
		});
	if (channel === undefined) {
		return undefined;
	}

	const mentions = [mention(member.id, { type: "user" }), mention(user.id, { type: "user" })];
	const mentionsFormatted = mentions.join(" ");

	client.bot.helpers.sendMessage(channel.id, { content: mentionsFormatted }).catch(() => {
		client.log.warn("Failed to mention participants in ticket.");
		return undefined;
	});

	client.bot.helpers
		.sendMessage(channel.id, {
			embeds: [
				{
					description: `${mention(user.id, { type: "user" })}: *${answers.topic}*`,
					color: constants.colours.husky,
				},
			],
		})
		.catch(() => {
			client.log.warn("Failed to send a topic message in the ticket channel.");
			return undefined;
		});

	const ticketDocument = await Ticket.create(client, {
		guildId: guild.id.toString(),
		authorId: member.id.toString(),
		channelId: channel.id.toString(),
		type,
		answers,
	});

	switch (type) {
		case "standalone": {
			client.tryLog("ticketOpen", {
				guildId: guild.id,
				journalling: configuration.journaling,
				args: [member, ticketDocument],
			});
			break;
		}
		case "inquiry": {
			client.tryLog("inquiryOpen", {
				guildId: guild.id,
				journalling: configuration.journaling,
				args: [member, ticketDocument],
			});
			break;
		}
	}

	ticketService.registerDocument(ticketDocument);
	ticketService.registerHandler(ticketDocument);

	if (type === "inquiry") {
		return ticketDocument;
	}

	const prompt = await ticketService.savePrompt(user, ticketDocument);
	if (prompt === undefined) {
		return undefined;
	}

	ticketService.registerPrompt(prompt, user.id, ticketDocument);

	return ticketDocument;
}

class TicketComposer extends ModalComposer<TicketFormData, never> {
	async buildModal(
		_: Logos.Interaction<any, any>,
		{ locale }: Logos.InteractionLocaleData,
		{ formData }: { formData: TicketFormData },
	): Promise<Modal<TicketFormData>> {
		const strings = {
			title: this.client.localise("ticket.title", locale)(),
			topic: this.client.localise("ticket.fields.topic", locale)(),
		};

		return {
			title: strings.title,
			elements: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "topic",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.topic, 45),
							style: Discord.TextStyles.Paragraph,
							required: true,
							maxLength: 100,
							value: formData.topic,
						},
					],
				},
			],
		};
	}
}

export { handleOpenTicket, openTicket };
