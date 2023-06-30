import configuration from "../../../../configuration.js";
import constants from "../../../../constants.js";
import { trim } from "../../../../formatting.js";
import { Client, localise } from "../../../client.js";
import { logEvent } from "../../../controllers/logging/logging.js";
import { stringifyValue } from "../../../database/database.js";
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
import reportManager from "../../../services/prompts/managers/reports.js";
import { getTextChannel, verifyIsWithinLimits } from "../../../utils.js";
import { CommandTemplate } from "../../command.js";
import {
	ApplicationCommandTypes,
	Bot,
	ButtonStyles,
	Embed,
	Interaction,
	InteractionTypes,
	MessageComponentTypes,
	TextStyles,
} from "discordeno";

const command: CommandTemplate = {
	name: "report",
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleMakeReport,
};

type ReportError = "failure" | "cannot_report_self";

async function handleMakeReport([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
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

		const reports = Array.from(reportsByAuthorAndGuild.values());
		if (!verifyIsWithinLimits(reports, configuration.commands.report.limitUses, configuration.commands.report.within)) {
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

			const channel = getTextChannel(guild, configuration.guilds.channels.reports);
			if (channel === undefined) {
				return true;
			}

			logEvent([client, bot], guild, "reportSubmit", [member, report.data]);

			const userId = BigInt(userDocument.data.account.id);
			const reference = stringifyValue(report.ref);

			const user = client.cache.users.get(userId);
			if (user === undefined) {
				return "failure";
			}

			const prompt = await reportManager.savePrompt([client, bot], guild, channel, user, report);
			if (prompt === undefined) {
				return "failure";
			}

			reportManager.registerPrompt(prompt, userId, reference, report);
			reportManager.registerHandler(client, [userId.toString(), guild.id.toString(), reference]);

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
	[client, bot]: [Client, Bot],
	submission: Interaction,
	error: ReportError | undefined,
): Promise<Interaction | undefined> {
	return new Promise((resolve) => {
		const continueId = createInteractionCollector([client, bot], {
			type: InteractionTypes.MessageComponent,
			onCollect: async (_, selection) => {
				deleteReply([client, bot], submission);
				resolve(selection);
			},
		});

		const cancelId = createInteractionCollector([client, bot], {
			type: InteractionTypes.MessageComponent,
			onCollect: async (_, cancelSelection) => {
				const returnId = createInteractionCollector([client, bot], {
					type: InteractionTypes.MessageComponent,
					onCollect: (_, returnSelection) => resolve(returnSelection),
				});

				const leaveId = createInteractionCollector([client, bot], {
					type: InteractionTypes.MessageComponent,
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
							type: MessageComponentTypes.ActionRow,
							components: [
								{
									type: MessageComponentTypes.Button,
									customId: returnId,
									label: strings.stay,
									style: ButtonStyles.Success,
								},
								{
									type: MessageComponentTypes.Button,
									customId: leaveId,
									label: strings.leave,
									style: ButtonStyles.Danger,
								},
							],
						},
					],
				});
			},
		});

		let embed!: Embed;
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
					type: MessageComponentTypes.ActionRow,
					components: [
						{
							type: MessageComponentTypes.Button,
							customId: continueId,
							label: strings.continue,
							style: ButtonStyles.Success,
						},
						{
							type: MessageComponentTypes.Button,
							customId: cancelId,
							label: strings.cancel,
							style: ButtonStyles.Danger,
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
				type: MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "reason",
						type: MessageComponentTypes.InputText,
						label: trim(strings.reason, 45),
						style: TextStyles.Paragraph,
						required: true,
						minLength: 16,
						maxLength: 256,
					},
				],
			},
			{
				type: MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "users",
						type: MessageComponentTypes.InputText,
						label: trim(strings.users, 45),
						style: TextStyles.Short,
						required: true,
						maxLength: 256,
					},
				],
			},
			{
				type: MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "messageLink",
						type: MessageComponentTypes.InputText,
						label: trim(strings.link, 45),
						style: TextStyles.Short,
						required: false,
						maxLength: 128,
					},
				],
			},
		],
	};
}

export default command;
