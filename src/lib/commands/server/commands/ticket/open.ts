import { Locale } from "../../../../../constants/languages";
import { mention, trim } from "../../../../../formatting";
import { Client, InteractionCollector } from "../../../../client";
import { Guild } from "../../../../database/guild";
import { Ticket, TicketType } from "../../../../database/ticket";
import { Modal, createModalComposer } from "../../../../interactions";
import { Configurations } from "../../../../services/prompts/service";
import { OptionTemplate } from "../../../command";

const option: OptionTemplate = {
	id: "open",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleOpenTicket,
};

type TicketError = "failure";

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
		configuration.rateLimit ?? defaults.TICKET_RATE_LIMIT,
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
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	createModalComposer<Ticket["answers"]>(client, interaction, {
		modal: generateTicketModal(client, { locale }),
		onSubmit: async (submission, answers) => {
			await client.postponeReply(submission);

			const result = await openTicket(
				client,
				configuration,
				answers,
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
						color: constants.colors.lightGreen,
					},
				],
			});

			return true;
		},
		onInvalid: async (submission, error) =>
			handleCouldNotOpenTicket(client, submission, error as TicketError | undefined, { locale }),
	});
}

async function openTicket(
	client: Client,
	_configuration: NonNullable<Configurations["tickets"] | Configurations["verification"]>,
	answers: Ticket["answers"],
	[guild, user, member]: [Logos.Guild, Logos.User, Logos.Member],
	categoryId: string,
	type: TicketType,
	{ guildLocale }: { guildLocale: Locale },
): Promise<Ticket | string> {
	const categoryChannel = client.entities.channels.get(BigInt(categoryId));
	if (categoryChannel === undefined) {
		return "failure";
	}

	const ticketService = client.getPromptService(guild.id, { type: "tickets" });
	if (ticketService === undefined) {
		return "failure";
	}

	const strings = {
		inquiry: client.localise("entry.verification.inquiry.inquiry", guildLocale)(),
	};

	const channel = await client.bot.helpers
		.createChannel(guild.id, {
			parentId: categoryId,
			name: trim(
				`${user.username}${constants.symbols.sigils.channelSeparator}${
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
		return "failure";
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
					color: constants.colors.husky,
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

	// TODO(vxern): Check against the global journalling setting.
	switch (type) {
		case "standalone": {
			client.tryLog("ticketOpen", { guildId: guild.id, args: [member, ticketDocument] });
			break;
		}
		case "inquiry": {
			client.tryLog("inquiryOpen", { guildId: guild.id, args: [member, ticketDocument] });
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
		return "failure";
	}

	ticketService.registerPrompt(prompt, user.id, ticketDocument);

	return ticketDocument;
}

async function handleCouldNotOpenTicket(
	client: Client,
	submission: Logos.Interaction,
	error: TicketError | undefined,
	{ locale }: { locale: Locale },
): Promise<Logos.Interaction | undefined> {
	const { promise, resolve } = Promise.withResolvers<Logos.Interaction | undefined>();

	const continueButton = new InteractionCollector(client, { only: [submission.user.id], isSingle: true });
	const cancelButton = new InteractionCollector(client, { only: [submission.user.id] });
	const returnButton = new InteractionCollector(client, {
		only: [submission.user.id],
		isSingle: true,
		dependsOn: cancelButton,
	});
	const leaveButton = new InteractionCollector(client, {
		only: [submission.user.id],
		isSingle: true,
		dependsOn: cancelButton,
	});

	continueButton.onCollect(async (buttonPress) => {
		client.deleteReply(submission);
		resolve(buttonPress);
	});

	cancelButton.onCollect(async (cancelButtonPress) => {
		returnButton.onCollect(async (returnButtonPress) => {
			client.deleteReply(submission);
			client.deleteReply(cancelButtonPress);
			resolve(returnButtonPress);
		});

		leaveButton.onCollect(async (_) => {
			client.deleteReply(submission);
			client.deleteReply(cancelButtonPress);
			resolve(undefined);
		});

		const strings = {
			title: client.localise("ticket.strings.sureToCancel.title", locale)(),
			description: client.localise("ticket.strings.sureToCancel.description", locale)(),
			stay: client.localise("prompts.stay", locale)(),
			leave: client.localise("prompts.leave", locale)(),
		};

		client.reply(cancelButtonPress, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							customId: returnButton.customId,
							label: strings.stay,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: leaveButton.customId,
							label: strings.leave,
							style: Discord.ButtonStyles.Danger,
						},
					],
				},
			],
		});
	});

	client.registerInteractionCollector(continueButton);
	client.registerInteractionCollector(cancelButton);
	client.registerInteractionCollector(returnButton);
	client.registerInteractionCollector(leaveButton);

	let embed!: Discord.CamelizedDiscordEmbed;
	switch (error) {
		default: {
			const strings = {
				title: client.localise("ticket.strings.failed", locale)(),
				description: client.localise("ticket.strings.failed", locale)(),
			};

			client.editReply(submission, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					},
				],
			});

			break;
		}
	}

	const strings = {
		continue: client.localise("prompts.continue", locale)(),
		cancel: client.localise("prompts.cancel", locale)(),
	};

	client.editReply(submission, {
		embeds: [embed],
		components: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						type: Discord.MessageComponentTypes.Button,
						customId: continueButton.customId,
						label: strings.continue,
						style: Discord.ButtonStyles.Success,
					},
					{
						type: Discord.MessageComponentTypes.Button,
						customId: cancelButton.customId,
						label: strings.cancel,
						style: Discord.ButtonStyles.Danger,
					},
				],
			},
		],
	});

	return promise;
}

function generateTicketModal(client: Client, { locale }: { locale: Locale }): Modal<Ticket["answers"]> {
	const strings = {
		title: client.localise("ticket.title", locale)(),
		topic: client.localise("ticket.fields.topic", locale)(),
	};

	return {
		title: strings.title,
		fields: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "topic",
						type: Discord.MessageComponentTypes.InputText,
						label: trim(strings.topic, 45),
						style: Discord.TextStyles.Paragraph,
						required: true,
						minLength: 16,
						maxLength: 256,
					},
				],
			},
		],
	};
}

export default option;
export { openTicket };
