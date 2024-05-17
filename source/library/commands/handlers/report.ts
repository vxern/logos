import { Client } from "logos/client";
import { ReportComposer } from "logos/commands/components/modal-composers/report-composer";
import { Guild } from "logos/database/guild";
import { Report } from "logos/database/report";

async function handleMakeReport(client: Client, interaction: Logos.Interaction): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.reports;
	if (configuration === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(interaction.guildId);
	if (guild === undefined) {
		return;
	}

	const member = interaction.member;
	if (member === undefined) {
		return;
	}

	const crossesRateLimit = Guild.crossesRateLimit(
		await Report.getAll(client, {
			where: { guildId: interaction.guildId.toString(), authorId: interaction.user.id.toString() },
		}),
		configuration.rateLimit ?? constants.defaults.REPORT_RATE_LIMIT,
	);
	if (crossesRateLimit) {
		const strings = constants.contexts.tooManyReports({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const reportService = client.getPromptService(guild.id, { type: "reports" });
	if (reportService === undefined) {
		return;
	}

	const composer = new ReportComposer(client, { interaction });

	composer.onSubmit(async (submission, { formData }) => {
		await client.postponeReply(submission);

		const reportDocument = await Report.create(client, {
			guildId: guild.id.toString(),
			authorId: interaction.user.id.toString(),
			formData,
		});

		await client.tryLog("reportSubmit", {
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

		const strings = constants.contexts.reportSubmitted({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.succeeded(submission, {
			title: strings.title,
			description: strings.description,
		});
	});

	await composer.open();
}

export { handleMakeReport };
