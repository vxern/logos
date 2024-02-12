import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { trim } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, InteractionCollector } from "../../../client";
import { timeStructToMilliseconds } from "../../../database/guild";
import { Guild } from "../../../database/guild";
import { Report } from "../../../database/report";
import { User } from "../../../database/user";
import { Modal, createModalComposer, deleteReply, editReply, postponeReply, reply } from "../../../interactions";
import { verifyIsWithinLimits } from "../../../utils";
import { CommandTemplate } from "../../command";

const command: CommandTemplate = {
	id: "report",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleMakeReport,
};

type ReportError = "failure" | "cannot_report_self";

async function handleMakeReport(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

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

	const configuration = guildDocument.features.moderation.features?.reports;
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
	const reportDocuments = Array.from(client.documents.reports.entries())
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
			title: client.localise("report.strings.tooMany.title", locale)(),
			description: client.localise("report.strings.tooMany.description", locale)(),
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

	const reportService = client.getPromptService(guild.id, { type: "reports" });
	if (reportService === undefined) {
		return;
	}

	createModalComposer<Report["answers"]>(client, interaction, {
		modal: generateReportModal(client, { locale }),
		onSubmit: async (submission, answers) => {
			await postponeReply(client, submission);

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
			await session.set(reportDocument);
			await session.saveChanges();

			session.dispose();

			if (configuration.journaling) {
				const journallingService = client.getJournallingService(guild.id);
				journallingService?.log("reportSubmit", { args: [member, reportDocument] });
			}

			const user = client.entities.users.get(interaction.user.id);
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
				title: client.localise("report.strings.submitted.title", locale)(),
				description: client.localise("report.strings.submitted.description", locale)(),
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
			handleSubmittedInvalidReport(client, submission, error as ReportError | undefined, { locale }),
	});
}

// TODO(vxern): This is repeated in several places. Refactor it.
async function handleSubmittedInvalidReport(
	client: Client,
	submission: Discord.Interaction,
	error: ReportError | undefined,
	{ locale }: { locale: Locale },
): Promise<Discord.Interaction | undefined> {
	const { promise, resolve } = Promise.withResolvers<Discord.Interaction | undefined>();

	const continueButton = new InteractionCollector({ only: [submission.user.id], isSingle: true });
	const cancelButton = new InteractionCollector({ only: [submission.user.id] });
	const returnButton = new InteractionCollector({
		only: [submission.user.id],
		isSingle: true,
		dependsOn: cancelButton,
	});
	const leaveButton = new InteractionCollector({
		only: [submission.user.id],
		isSingle: true,
		dependsOn: cancelButton,
	});

	continueButton.onCollect(async (buttonPress) => {
		deleteReply(client, submission);
		resolve(buttonPress);
	});

	cancelButton.onCollect(async (cancelButtonPress) => {
		returnButton.onCollect(async (returnButtonPress) => {
			deleteReply(client, submission);
			deleteReply(client, cancelButtonPress);
			resolve(returnButtonPress);
		});

		leaveButton.onCollect(async (_) => {
			deleteReply(client, submission);
			deleteReply(client, cancelButtonPress);
			resolve(undefined);
		});

		const strings = {
			title: client.localise("report.strings.sureToCancel.title", locale)(),
			description: client.localise("report.strings.sureToCancel.description", locale)(),
			stay: client.localise("prompts.stay", locale)(),
			leave: client.localise("prompts.leave", locale)(),
		};

		reply(client, cancelButtonPress, {
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
		case "cannot_report_self": {
			const strings = {
				title: client.localise("report.strings.cannotReportSelf.title", locale)(),
				description: client.localise("report.strings.cannotReportSelf.description", locale)(),
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
				title: client.localise("report.strings.failed.title", locale)(),
				description: client.localise("report.strings.failed.description", locale)(),
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

			return;
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

function generateReportModal(client: Client, { locale }: { locale: Locale }): Modal<Report["answers"]> {
	const strings = {
		title: client.localise("report.title", locale)(),
		reason: client.localise("report.fields.reason", locale)(),
		users: client.localise("report.fields.users", locale)(),
		link: client.localise("report.fields.link", locale)(),
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
