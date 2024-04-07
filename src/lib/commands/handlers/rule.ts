import { Locale } from "logos:constants/languages";
import { Rule, isValidRule } from "logos:constants/rules";
import { Client } from "logos/client";
import { getRuleTitleFormatted } from "logos/commands/rules";
import { Guild } from "logos/database/guild";

async function handleCiteRuleAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { rule: string }>,
): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.warns;
	if (configuration === undefined) {
		return;
	}

	const locale = interaction.locale;

	const ruleLowercase = interaction.parameters.rule.trim().toLowerCase();
	const choices = constants.rules
		.map((rule) => {
			return {
				name: getRuleTitleFormatted(client, { rule, mode: "option" }, { locale }),
				value: rule,
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(ruleLowercase));

	await client.respond(interaction, choices);
}

async function handleCiteRule(client: Client, interaction: Logos.Interaction<any, { rule: Rule }>): Promise<void> {
	const locale = interaction.parameters.show ? interaction.guildLocale : interaction.locale;

	if (!isValidRule(interaction.parameters.rule)) {
		await displayError(client, interaction, { locale: interaction.locale });
		return;
	}

	const guild = client.entities.guilds.get(interaction.guildId);
	if (guild === undefined) {
		return;
	}

	const strings = {
		tldr: client.localise("rules.tldr", locale)(),
		summary: client.localise(`rules.${interaction.parameters.rule}.summary`, locale)(),
		content: client.localise(`rules.${interaction.parameters.rule}.content`, locale)(),
	};

	const components: Discord.ActionRow[] | undefined = interaction.parameters.show
		? undefined
		: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [client.interactionRepetitionService.getShowButton(interaction, { locale })],
				},
		  ];

	await client.notice(
		interaction,
		{
			embeds: [
				{
					title: getRuleTitleFormatted(client, { rule: interaction.parameters.rule, mode: "display" }, { locale }),
					description: strings.content,
					footer: { text: `${strings.tldr}: ${strings.summary}` },
					image: { url: constants.gifs.chaosWithoutRules },
				},
			],
			components,
		},
		{ visible: interaction.parameters.show },
	);
}

async function displayError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("rule.strings.invalid.title", locale)(),
		description: client.localise("rule.strings.invalid.description", locale)(),
	};

	await client.error(interaction, {
		title: strings.title,
		description: strings.description,
	});
}

export { handleCiteRule, handleCiteRuleAutocomplete };
