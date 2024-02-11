import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import { Locale } from "../../../../../constants/languages";
import defaults from "../../../../../defaults";
import { MentionTypes, mention, trim } from "../../../../../formatting";
import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { Guild, timeStructToMilliseconds } from "../../../../database/guild";
import { Ticket, TicketType } from "../../../../database/ticket";
import { User } from "../../../../database/user";
import {
	Modal,
	createInteractionCollector,
	createModalComposer,
	deleteReply,
	editReply,
	postponeReply,
	reply,
} from "../../../../interactions";
import { Configurations } from "../../../../services/prompts/service";
import { verifyIsWithinLimits } from "../../../../utils";
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

	let session = client.database.openSession();

	const guildDocument =
		client.documents.guilds.get(guildId.toString()) ??
		(await session.get<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.server.features?.tickets;
	if (configuration === undefined || !configuration.enabled) {
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

	session = client.database.openSession();

	const userDocument =
		client.documents.users.get(interaction.user.id.toString()) ??
		(await session.get<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined)) ??
		(await (async () => {
			const userDocument = {
				...({
					id: `users/${interaction.user.id}`,
					account: { id: interaction.user.id.toString() },
					createdAt: Date.now(),
				} satisfies User),
				"@metadata": { "@collection": "Users" },
			};
			await session.set(userDocument);
			await session.saveChanges();

			return userDocument as User;
		})());

	session.dispose();

	if (userDocument === undefined) {
		return;
	}

	const compositeIdPartial = `${guildId}/${interaction.user.id}`;
	const ticketDocuments = Array.from(client.documents.tickets.entries())
		.filter(([key, _]) => key.startsWith(compositeIdPartial))
		.map(([_, value]) => value);
	const intervalMilliseconds = timeStructToMilliseconds(configuration.rateLimit?.within ?? defaults.TICKET_INTERVAL);
	if (
		!verifyIsWithinLimits(
			ticketDocuments.map((ticketDocument) => ticketDocument.createdAt),
			configuration.rateLimit?.uses ?? defaults.TICKET_LIMIT,
			intervalMilliseconds,
		)
	) {
		const strings = {
			title: client.localise("ticket.strings.tooMany.title", locale)(),
			description: client.localise("ticket.strings.tooMany.description", locale)(),
		};

		reply(client, interaction, {
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
			await postponeReply(client, submission);

			const result = await openTicket(
				client,
				configuration,
				answers,
				[guild, submission.user, member, userDocument],
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

			editReply(client, submission, {
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
	configuration: NonNullable<Configurations["tickets"] | Configurations["verification"]>,
	answers: Ticket["answers"],
	[guild, user, member, userDocument]: [Logos.Guild, Logos.User, Logos.Member, User],
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

	const session = client.database.openSession();

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

	const mentions = [mention(member.id, MentionTypes.User), mention(user.id, MentionTypes.User)];
	const mentionsFormatted = mentions.join(" ");

	client.bot.helpers.sendMessage(channel.id, { content: mentionsFormatted }).catch(() => {
		client.log.warn("Failed to mention participants in ticket.");
		return undefined;
	});

	client.bot.helpers
		.sendMessage(channel.id, {
			embeds: [
				{
					description: `${mention(user.id, MentionTypes.User)}: *${answers.topic}*`,
					color: constants.colors.husky,
				},
			],
		})
		.catch(() => {
			client.log.warn("Failed to send a topic message in the ticket channel.");
			return undefined;
		});

	const ticketDocument = {
		...({
			id: `tickets/${guild.id}/${userDocument.account.id}/${channel.id}`,
			guildId: guild.id.toString(),
			authorId: userDocument.account.id,
			channelId: channel.id.toString(),
			answers,
			isResolved: false,
			type,
			createdAt: Date.now(),
		} satisfies Ticket),
		"@metadata": { "@collection": "Tickets" },
	};
	await session.set(ticketDocument);
	await session.saveChanges();
	session.dispose();

	if (configuration.journaling) {
		const journallingService = client.getJournallingService(guild.id);

		switch (type) {
			case "standalone": {
				journallingService?.log("ticketOpen", { args: [member, ticketDocument] });
				break;
			}
			case "inquiry": {
				journallingService?.log("inquiryOpen", { args: [member, ticketDocument] });
				break;
			}
		}
	}

	const compositeId = `${guild.id}/${user.id}/${channel.id}`;
	ticketService.registerDocument(compositeId, ticketDocument);
	ticketService.registerHandler(compositeId);

	if (type === "inquiry") {
		return ticketDocument;
	}

	const prompt = await ticketService.savePrompt(user, ticketDocument);
	if (prompt === undefined) {
		return "failure";
	}

	ticketService.registerPrompt(prompt, user.id, compositeId, ticketDocument);

	return ticketDocument;
}

async function handleCouldNotOpenTicket(
	client: Client,
	submission: Discord.Interaction,
	error: TicketError | undefined,
	{ locale }: { locale: Locale },
): Promise<Discord.Interaction | undefined> {
	return new Promise((resolve) => {
		const continueId = createInteractionCollector(client, {
			type: Discord.InteractionTypes.MessageComponent,
			onCollect: async (selection) => {
				deleteReply(client, submission);
				resolve(selection);
			},
		});

		const cancelId = createInteractionCollector(client, {
			type: Discord.InteractionTypes.MessageComponent,
			onCollect: async (cancelSelection) => {
				const returnId = createInteractionCollector(client, {
					type: Discord.InteractionTypes.MessageComponent,
					onCollect: async (returnSelection) => {
						deleteReply(client, submission);
						deleteReply(client, cancelSelection);
						resolve(returnSelection);
					},
				});

				const leaveId = createInteractionCollector(client, {
					type: Discord.InteractionTypes.MessageComponent,
					onCollect: async (_) => {
						deleteReply(client, submission);
						deleteReply(client, cancelSelection);
						resolve(undefined);
					},
				});

				const strings = {
					title: client.localise("ticket.strings.sureToCancel.title", locale)(),
					description: client.localise("ticket.strings.sureToCancel.description", locale)(),
					stay: client.localise("prompts.stay", locale)(),
					leave: client.localise("prompts.leave", locale)(),
				};

				reply(client, cancelSelection, {
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
									customId: returnId,
									label: strings.stay,
									style: Discord.ButtonStyles.Success,
								},
								{
									type: Discord.MessageComponentTypes.Button,
									customId: leaveId,
									label: strings.leave,
									style: Discord.ButtonStyles.Danger,
								},
							],
						},
					],
				});
			},
		});

		let embed!: Discord.CamelizedDiscordEmbed;
		switch (error) {
			default: {
				const strings = {
					title: client.localise("ticket.strings.failed", locale)(),
					description: client.localise("ticket.strings.failed", locale)(),
				};

				editReply(client, submission, {
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

		editReply(client, submission, {
			embeds: [embed],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							customId: continueId,
							label: strings.continue,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: cancelId,
							label: strings.cancel,
							style: Discord.ButtonStyles.Danger,
						},
					],
				},
			],
		});
	});
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
