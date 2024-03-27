import { Client } from "logos/client";
import { ReportComposer } from "logos/commands/components/modal-composers/report-composer";
import { Guild } from "logos/database/guild";
import { Report } from "logos/database/report";

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
	if (crossesRateLimit) {
		const strings = {
			title: client.localise("report.strings.tooMany.title", locale)(),
			description: client.localise("report.strings.tooMany.description", locale)(),
		};

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

	composer.onSubmit(async (submission, { locale }, { formData }) => {
		await client.postponeReply(submission);

		const reportDocument = await Report.create(client, {
			guildId: guild.id.toString(),
			authorId: interaction.user.id.toString(),
			answers: formData,
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

		const strings = {
			title: client.localise("report.strings.submitted.title", locale)(),
			description: client.localise("report.strings.submitted.description", locale)(),
		};

		await client.succeeded(submission, {
			title: strings.title,
			description: strings.description,
		});
	});

	await composer.open();
}

export { handleMakeReport };
