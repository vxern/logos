import { Locale } from "../../../../constants/languages";
import { trim } from "../../../../formatting";
import { Client, InteractionCollector } from "../../../client";
import { Guild } from "../../../database/guild";
import { Report, ReportFormData } from "../../../database/report";
import { Modal, createModalComposer } from "../../../interactions";
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

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.reports;
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
		await Report.getAll(client, { where: { authorId: interaction.user.id.toString() } }),
		configuration.rateLimit ?? defaults.REPORT_RATE_LIMIT,
	);
	if (!crossesRateLimit) {
		const strings = {
			title: client.localise("report.strings.tooMany.title", locale)(),
			description: client.localise("report.strings.tooMany.description", locale)(),
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

	const reportService = client.getPromptService(guild.id, { type: "reports" });
	if (reportService === undefined) {
		return;
	}

	createModalComposer<ReportFormData>(client, interaction, {
		modal: generateReportModal(client, { locale }),
		onSubmit: async (submission, answers) => {
			await client.postponeReply(submission);

			const reportDocument = await Report.create(client, {
				guildId: guild.id.toString(),
				authorId: interaction.user.id.toString(),
				answers,
			});

			client.tryLog("reportSubmit", {
				guildId: guild.id,
				journalling: configuration.journaling,
				args: [member, reportDocument],
			});

			const user = client.entities.users.get(interaction.user.id);
			if (user === undefined) {
				return "failure";
			}

			const prompt = await reportService.savePrompt(user, reportDocument);
			if (prompt === undefined) {
				return "failure";
			}

			reportService.registerDocument(reportDocument);
			reportService.registerPrompt(prompt, user.id, reportDocument);
			reportService.registerHandler(reportDocument);

			const strings = {
				title: client.localise("report.strings.submitted.title", locale)(),
				description: client.localise("report.strings.submitted.description", locale)(),
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

			return true;
		},
		onInvalid: async (submission, error) =>
			handleSubmittedInvalidReport(client, submission, error as ReportError | undefined, { locale }),
	});
}

// TODO(vxern): This is repeated in several places. Refactor it.
async function handleSubmittedInvalidReport(
	client: Client,
	submission: Logos.Interaction,
	error: ReportError | undefined,
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
			title: client.localise("report.strings.sureToCancel.title", locale)(),
			description: client.localise("report.strings.sureToCancel.description", locale)(),
			stay: client.localise("prompts.stay", locale)(),
			leave: client.localise("prompts.leave", locale)(),
		};

		client.reply(cancelButtonPress, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
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
				color: constants.colours.dullYellow,
			};
			break;
		}
		default: {
			const strings = {
				title: client.localise("report.strings.failed.title", locale)(),
				description: client.localise("report.strings.failed.description", locale)(),
			};

			client.editReply(submission, {
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

function generateReportModal(client: Client, { locale }: { locale: Locale }): Modal<ReportFormData> {
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
