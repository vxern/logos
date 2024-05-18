import { type Rule, isValidRule } from "logos:constants/rules";
import type { Client } from "logos/client";
import { getRuleTitleFormatted } from "logos/commands/rules";
import { Guild } from "logos/models/guild";

async function handleCiteRuleAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { rule: string }>,
): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.warns;
	if (configuration === undefined) {
		return;
	}

	const ruleLowercase = interaction.parameters.rule.trim().toLowerCase();
	const choices = constants.rules
		.map((rule) => {
			return {
				name: getRuleTitleFormatted(client, interaction, { rule, mode: "option" }),
				value: rule,
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(ruleLowercase));

	await client.respond(interaction, choices);
}

async function handleCiteRule(client: Client, interaction: Logos.Interaction<any, { rule: Rule }>): Promise<void> {
	if (!isValidRule(interaction.parameters.rule)) {
		await displayError(client, interaction);
		return;
	}

	const guild = client.entities.guilds.get(interaction.guildId);
	if (guild === undefined) {
		return;
	}

	const components: Discord.ActionRow[] | undefined = interaction.parameters.show
		? undefined
		: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [client.interactionRepetitionService.getShowButton(interaction)],
				},
		  ];

	const strings = {
		...constants.contexts.tldr({
			localise: client.localise.bind(client),
			locale: interaction.parameters.show ? interaction.guildLocale : interaction.locale,
		}),
		...constants.contexts.rule({
			localise: client.localise.bind(client),
			locale: interaction.parameters.show ? interaction.guildLocale : interaction.locale,
		}),
	};
	await client.notice(
		interaction,
		{
			embeds: [
				{
					title: getRuleTitleFormatted(client, interaction, {
						rule: interaction.parameters.rule,
						mode: "display",
					}),
					description: strings.content(interaction.parameters.rule),
					footer: { text: `${strings.tldr}: ${strings.summary(interaction.parameters.rule)}` },
					image: { url: constants.gifs.chaosWithoutRules },
				},
			],
			components,
		},
		{ visible: interaction.parameters.show },
	);
}

async function displayError(client: Client, interaction: Logos.Interaction): Promise<void> {
	const strings = constants.contexts.ruleInvalid({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});
	await client.error(interaction, {
		title: strings.title,
		description: strings.description,
	});
}

export { handleCiteRule, handleCiteRuleAutocomplete };
