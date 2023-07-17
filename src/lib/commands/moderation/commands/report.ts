import constants from "../../../../constants.js";
import defaults from "../../../../defaults.js";
import { trim } from "../../../../formatting.js";
import { Client, localise } from "../../../client.js";
import { stringifyValue } from "../../../database/database.js";
import { timeStructToMilliseconds } from "../../../database/structs/guild.js";
import { Report } from "../../../database/structs/report.js";
import {
	Modal,
	createInteractionCollector,
	createModalComposer,
	deleteReply,
	editReply,
	postponeReply,
	reply,
} from "../../../interactions.js";
import { verifyIsWithinLimits } from "../../../utils.js";
import { CommandTemplate } from "../../command.js";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "report",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleMakeReport,
};

type ReportError = "failure" | "cannot_report_self";

async function handleMakeReport([client, bot]: [Client, Discord.Bot], interaction: Discord.Interaction): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetchOrCreate(
		client,
		"id",
		guildId.toString(),
		guildId,
	);
	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.data.features.moderation.features?.reports;
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

	const userDocument = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		"id",
		interaction.user.id.toString(),
		interaction.user.id,
	);
	if (userDocument === undefined) {
		return;
	}

	const reportsByAuthorAndGuild = client.database.adapters.reports.get(client, "authorAndGuild", [
		userDocument.ref,
		guild.id.toString(),
	]);
	if (reportsByAuthorAndGuild !== undefined) {
		const strings = {
			title: localise(client, "report.strings.tooMany.title", interaction.locale)(),
			description: localise(client, "report.strings.tooMany.description", interaction.locale)(),
		};

		const intervalMilliseconds = timeStructToMilliseconds(configuration.rateLimit?.within ?? defaults.REPORT_INTERVAL);

		const reports = Array.from(reportsByAuthorAndGuild.values());
		if (!verifyIsWithinLimits(reports, configuration.rateLimit?.uses ?? defaults.REPORT_LIMIT, intervalMilliseconds)) {
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
	}

	const reportService = client.services.prompts.reports.get(guild.id);
	if (reportService === undefined) {
		return;
	}

	createModalComposer<Report["answers"]>([client, bot], interaction, {
		modal: generateReportModal(client, interaction.locale),
		onSubmit: async (submission, answers) => {
			await postponeReply([client, bot], submission);

			const report = await client.database.adapters.reports.create(client, {
				createdAt: Date.now(),
				author: userDocument.ref,
				guild: guild.id.toString(),
				answers,
				isResolved: false,
			});
			if (report === undefined) {
				return "failure";
			}

			if (configuration.journaling) {
				const journallingService = client.services.journalling.get(guild.id);
				journallingService?.log(bot, "reportSubmit", { args: [member, report.data] });
			}

			const userId = BigInt(userDocument.data.account.id);
			const reference = stringifyValue(report.ref);

			const user = client.cache.users.get(userId);
			if (user === undefined) {
				return "failure";
			}

			const prompt = await reportService.savePrompt(bot, user, report);
			if (prompt === undefined) {
				return "failure";
			}

			reportService.registerPrompt(prompt, userId, reference, report);
			reportService.registerHandler([userId.toString(), guild.id.toString(), reference]);

			const strings = {
				title: localise(client, "report.strings.submitted.title", interaction.locale)(),
				description: localise(client, "report.strings.submitted.description", interaction.locale)(),
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
			handleSubmittedInvalidReport([client, bot], submission, error as ReportError | undefined),
	});
}

async function handleSubmittedInvalidReport(
	[client, bot]: [Client, Discord.Bot],
	submission: Discord.Interaction,
	error: ReportError | undefined,
): Promise<Discord.Interaction | undefined> {
	return new Promise((resolve) => {
		const continueId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			onCollect: async (_, selection) => {
				deleteReply([client, bot], submission);
				resolve(selection);
			},
		});

		const cancelId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			onCollect: async (_, cancelSelection) => {
				const returnId = createInteractionCollector([client, bot], {
					type: Discord.InteractionTypes.MessageComponent,
					onCollect: (_, returnSelection) => resolve(returnSelection),
				});

				const leaveId = createInteractionCollector([client, bot], {
					type: Discord.InteractionTypes.MessageComponent,
					onCollect: async (_, _leaveSelection) => {
						deleteReply([client, bot], submission);
						deleteReply([client, bot], cancelSelection);
						resolve(undefined);
					},
				});

				const strings = {
					title: localise(client, "report.strings.sureToCancel.title", cancelSelection.locale)(),
					description: localise(client, "report.strings.sureToCancel.description", cancelSelection.locale)(),
					stay: localise(client, "prompts.stay", cancelSelection.locale)(),
					leave: localise(client, "prompts.leave", cancelSelection.locale)(),
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

		let embed!: Discord.Embed;
		switch (error) {
			case "cannot_report_self": {
				const strings = {
					title: localise(client, "report.strings.cannotReportSelf.title", submission.locale)(),
					description: localise(client, "report.strings.cannotReportSelf.description", submission.locale)(),
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
					title: localise(client, "report.strings.failed.title", submission.locale)(),
					description: localise(client, "report.strings.failed.description", submission.locale)(),
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
				break;
			}
		}

		const strings = {
			continue: localise(client, "prompts.continue", submission.locale)(),
			cancel: localise(client, "prompts.cancel", submission.locale)(),
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

function generateReportModal(client: Client, locale: string | undefined): Modal<Report["answers"]> {
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
