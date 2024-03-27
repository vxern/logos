import { Locale } from "logos:constants/languages";
import { mention, trim } from "logos:core/formatting";
import { Client } from "logos/client";
import { TicketComposer } from "logos/commands/components/modal-composers/ticket-composer";
import { Guild } from "logos/database/guild";
import { Ticket, TicketFormData, TicketType } from "logos/database/ticket";
import { Configurations } from "logos/services/prompts/service";

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
	if (crossesRateLimit) {
		const strings = {
			title: client.localise("ticket.strings.tooMany.title", locale)(),
			description: client.localise("ticket.strings.tooMany.description", locale)(),
		};

		await client.pushback(interaction, {
			title: strings.title,
			description: strings.description,
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

			const ticketDocument = await openTicket(
				client,
				configuration,
				formData,
				[guild, submission.user, member],
				configuration.categoryId,
				"standalone",
				{ guildLocale },
			);
			if (ticketDocument === undefined) {
				return;
			}

			const strings = {
				title: client.localise("ticket.strings.sent.title", locale)(),
				description: client.localise("ticket.strings.sent.description", locale)(),
			};

			await client.succeeded(submission, {
				title: strings.title,
				description: strings.description,
			});
		},
	);

	await composer.open();
}

// TODO(vxern): This number of parameters is insanity, this function is way too large.
// TODO(vxern): Move this elsewhere. Turn into a service?
async function openTicket(
	client: Client,
	configuration: NonNullable<Configurations["tickets"] | Configurations["verification"]>,
	answers: Ticket["formData"],
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
			await client.tryLog("ticketOpen", {
				guildId: guild.id,
				journalling: configuration.journaling,
				args: [member, ticketDocument],
			});
			break;
		}
		case "inquiry": {
			await client.tryLog("inquiryOpen", {
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

export { handleOpenTicket, openTicket };
