import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { trim } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { timeStructToMilliseconds } from "../../../database/guild";
import { Report } from "../../../database/report";
import {
	Modal,
	createInteractionCollector,
	createModalComposer,
	deleteReply,
	editReply,
	postponeReply,
	reply,
} from "../../../interactions";
import { verifyIsWithinLimits } from "../../../utils";
import { CommandTemplate } from "../../command";
import { Guild } from "../../../database/guild";
import { User } from "../../../database/user";

const command: CommandTemplate = {
	name: "report",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleMakeReport,
};

type ReportError = "failure" | "cannot_report_self";

async function handleMakeReport([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	let session = client.database.openSession();

	const guildDocument =
		client.cache.documents.guilds.get(guildId.toString()) ??
		(await session.load<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.moderation.features?.reports;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const member = interaction.member;
	if (member === undefined) {
		return;
	}

	session = client.database.openSession();

	const userDocument =
		client.cache.documents.users.get(interaction.user.id.toString()) ??
		(await session.load<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined)) ??
		(await (async () => {
			const userDocument = {
				...({
					id: `users/${interaction.user.id}`,
					account: { id: interaction.user.id.toString() },
					createdAt: Date.now(),
				} satisfies User),
				"@metadata": { "@collection": "Users" },
			};
			await session.store(userDocument);
			await session.saveChanges();

			return userDocument as User;
		})());

	session.dispose();

	if (userDocument === undefined) {
		return;
	}

	const compositeIdPartial = `${guildId}/${interaction.user.id}`;
	const reportDocuments = Array.from(client.cache.documents.reports.entries())
		.filter(([key, _]) => key.startsWith(compositeIdPartial))
		.map(([_, value]) => value);
	const intervalMilliseconds = timeStructToMilliseconds(configuration.rateLimit?.within ?? defaults.REPORT_INTERVAL);
	if (
		!verifyIsWithinLimits(
			reportDocuments.map((reportDocument) => reportDocument.createdAt),
			configuration.rateLimit?.uses ?? defaults.REPORT_LIMIT,
			intervalMilliseconds,
		)
	) {
		const strings = {
			title: localise(client, "report.strings.tooMany.title", locale)(),
			description: localise(client, "report.strings.tooMany.description", locale)(),
		};

		reply([client, bot], interaction, {
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

	const reportService = client.services.prompts.reports.get(guild.id);
	if (reportService === undefined) {
		return;
	}

	createModalComposer<Report["answers"]>([client, bot], interaction, {
		modal: generateReportModal(client, { locale }),
		onSubmit: async (submission, answers) => {
			await postponeReply([client, bot], submission);

			const session = client.database.openSession();

			const createdAt = Date.now();
			const reportDocument = {
				...({
					id: `reports/${guildId}/${userDocument.account.id}/${createdAt}`,
					guildId: guild.id.toString(),
					authorId: userDocument.account.id,
					answers,
					isResolved: false,
					createdAt,
				} satisfies Report),
				"@metadata": { "@collection": "Reports" },
			};
			await session.store(reportDocument);
			await session.saveChanges();

			session.dispose();

			if (configuration.journaling) {
				const journallingService = client.services.journalling.get(guild.id);
				journallingService?.log("reportSubmit", { args: [member, reportDocument] });
			}

			const user = client.cache.users.get(interaction.user.id);
			if (user === undefined) {
				return "failure";
			}

			const prompt = await reportService.savePrompt(user, reportDocument);
			if (prompt === undefined) {
				return "failure";
			}

			const compositeId = `${guildId}/${userDocument.account.id}/${createdAt}`;
			reportService.registerDocument(compositeId, reportDocument);
			reportService.registerPrompt(prompt, user.id, compositeId, reportDocument);
			reportService.registerHandler(compositeId);

			const strings = {
				title: localise(client, "report.strings.submitted.title", locale)(),
				description: localise(client, "report.strings.submitted.description", locale)(),
			};

			editReply([client, bot], submission, {
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
			handleSubmittedInvalidReport([client, bot], submission, error as ReportError | undefined, { locale }),
	});
}

async function handleSubmittedInvalidReport(
	[client, bot]: [Client, Discord.Bot],
	submission: Discord.Interaction,
	error: ReportError | undefined,
	{ locale }: { locale: Locale },
): Promise<Discord.Interaction | undefined> {
	return new Promise((resolve) => {
		const continueId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			onCollect: async (selection) => {
				deleteReply([client, bot], submission);
				resolve(selection);
			},
		});

		const cancelId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			onCollect: async (cancelSelection) => {
				const returnId = createInteractionCollector([client, bot], {
					type: Discord.InteractionTypes.MessageComponent,
					onCollect: async (returnSelection) => {
						deleteReply([client, bot], submission);
						deleteReply([client, bot], cancelSelection);
						resolve(returnSelection);
					},
				});

				const leaveId = createInteractionCollector([client, bot], {
					type: Discord.InteractionTypes.MessageComponent,
					onCollect: async (_) => {
						deleteReply([client, bot], submission);
						deleteReply([client, bot], cancelSelection);
						resolve(undefined);
					},
				});

				const strings = {
					title: localise(client, "report.strings.sureToCancel.title", locale)(),
					description: localise(client, "report.strings.sureToCancel.description", locale)(),
					stay: localise(client, "prompts.stay", locale)(),
					leave: localise(client, "prompts.leave", locale)(),
				};

				reply([client, bot], cancelSelection, {
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
			case "cannot_report_self": {
				const strings = {
					title: localise(client, "report.strings.cannotReportSelf.title", locale)(),
					description: localise(client, "report.strings.cannotReportSelf.description", locale)(),
				};

				embed = {
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				};
				break;
			}
			default: {
				const strings = {
					title: localise(client, "report.strings.failed.title", locale)(),
					description: localise(client, "report.strings.failed.description", locale)(),
				};

				editReply([client, bot], submission, {
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
		}

		const strings = {
			continue: localise(client, "prompts.continue", locale)(),
			cancel: localise(client, "prompts.cancel", locale)(),
		};

		editReply([client, bot], submission, {
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

function generateReportModal(client: Client, { locale }: { locale: Locale }): Modal<Report["answers"]> {
	const strings = {
		title: localise(client, "report.title", locale)(),
		reason: localise(client, "report.fields.reason", locale)(),
		users: localise(client, "report.fields.users", locale)(),
		link: localise(client, "report.fields.link", locale)(),
	};

	return {
		title: strings.title,
		fields: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "reason",
						type: Discord.MessageComponentTypes.InputText,
						label: trim(strings.reason, 45),
						style: Discord.TextStyles.Paragraph,
						required: true,
						minLength: 16,
						maxLength: 256,
					},
				],
			},
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "users",
						type: Discord.MessageComponentTypes.InputText,
						label: trim(strings.users, 45),
						style: Discord.TextStyles.Short,
						required: true,
						maxLength: 256,
					},
				],
			},
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "messageLink",
						type: Discord.MessageComponentTypes.InputText,
						label: trim(strings.link, 45),
						style: Discord.TextStyles.Short,
						required: false,
						maxLength: 128,
					},
				],
			},
		],
	};
}

export default command;
