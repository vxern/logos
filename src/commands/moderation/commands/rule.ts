import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise, Services } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.rule),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handleCiteRule,
	handleAutocomplete: handleCiteRuleAutocomplete,
	options: [{
		...createLocalisations(Commands.rule.options.rule),
		type: ApplicationCommandOptionTypes.String,
		required: true,
		autocomplete: true,
	}],
};

function handleCiteRuleAutocomplete([_, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ rule: ruleOrUndefined }] = parseArguments(interaction.data?.options, {});
	const ruleQuery = ruleOrUndefined ?? '';

	const rules = Object.values(Services.notices.notices.information.rules.rules);

	const ruleQueryLowercase = ruleQuery.toLowerCase();
	const choices = rules.map((rule, indexZeroBased) => {
		const index = indexZeroBased + 1;
		const titleWithTLDR = localise(rule.title, interaction.locale);

		return {
			name: `#${index}: ${titleWithTLDR}`,
			value: indexZeroBased.toString(),
		};
	}).filter((choice) => choice.name.toLowerCase().includes(ruleQueryLowercase));

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
			data: { choices },
		},
	);
}

function handleCiteRule([client, bot]: [Client, Bot], interaction: Interaction): void {
	const rules = Object.values(Services.notices.notices.information.rules.rules);

	const [{ rule }] = parseArguments(interaction.data?.options, { rule: 'number' });
	if (rule === undefined) return displayError(bot, interaction);

	const ruleParsed = rules.at(rule);
	if (ruleParsed === undefined) return displayError(bot, interaction);

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const ruleString = localise(Services.notices.notices.information.rules.rule, defaultLocale);
	const ruleTitleString = localise(ruleParsed.title, defaultLocale);
	const tldrString = localise(Services.notices.notices.information.rules.tldr, defaultLocale);
	const summaryString = localise(ruleParsed.summary, defaultLocale);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `${ruleString} #${rule + 1}: ${ruleTitleString} ~ ${tldrString}: *${summaryString}*`,
					description: localise(ruleParsed.content, defaultLocale),
					color: constants.colors.blue,
				}],
			},
		},
	);
}

function displayError(bot: Bot, interaction: Interaction): void {
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: localise(Commands.rule.strings.invalidRule, interaction.locale),
					color: constants.colors.red,
				}],
			},
		},
	);
}

export default command;
