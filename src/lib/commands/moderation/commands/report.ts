import { trim } from "../../../../formatting";
import { Client } from "../../../client";
import { Modal, ModalComposer } from "../../../components/modal-composer";
import { Guild } from "../../../database/guild";
import { Report, ReportFormData } from "../../../database/report";

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
		configuration.rateLimit ?? constants.defaults.REPORT_RATE_LIMIT,
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

	const composer = new ReportComposer(client, { interaction });

	composer.onSubmit(async (submission, { locale }, { formData }) => {
		await client.postponeReply(submission);

		const reportDocument = await Report.create(client, {
			guildId: guild.id.toString(),
			authorId: interaction.user.id.toString(),
			answers: formData,
		});

		client.tryLog("reportSubmit", {
			guildId: guild.id,
			journalling: configuration.journaling,
			args: [member, reportDocument],
		});

		const user = client.entities.users.get(interaction.user.id);
		if (user === undefined) {
			return;
		}

		const prompt = await reportService.savePrompt(user, reportDocument);
		if (prompt === undefined) {
			return;
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
	});

	await composer.open();
}

class ReportComposer extends ModalComposer<ReportFormData, never> {
	async buildModal(
		_: Logos.Interaction,
		{ locale }: Logos.InteractionLocaleData,
		{ formData }: { formData: ReportFormData },
	): Promise<Modal<ReportFormData>> {
		const strings = {
			title: this.client.localise("report.title", locale)(),
			fields: {
				reason: this.client.localise("report.fields.reason", locale)(),
				users: this.client.localise("report.fields.users", locale)(),
				link: this.client.localise("report.fields.link", locale)(),
			},
		};

		return {
			title: strings.title,
			elements: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "reason",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.reason, 45),
							style: Discord.TextStyles.Paragraph,
							required: true,
							value: formData.reason,
						},
					],
				},
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "users",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.users, 45),
							style: Discord.TextStyles.Short,
							required: true,
							value: formData.users,
						},
					],
				},
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "messageLink",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.link, 45),
							style: Discord.TextStyles.Short,
							required: false,
							value: formData.messageLink ?? "",
						},
					],
				},
			],
		};
	}
}

export { handleMakeReport };
