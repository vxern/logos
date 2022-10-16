import { Commands } from '../../../../assets/localisations/commands.ts';
import {
	createLocalisations,
	localise,
} from '../../../../assets/localisations/types.ts';
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { capitalise } from '../../../formatting.ts';
import ruleGenerators from '../../secret/data/information/generators/rules.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.cite),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: citeRule,
	options: [{
		...createLocalisations(Commands.cite.options.rule),
		type: ApplicationCommandOptionTypes.String,
		required: true,
		autocomplete: true,
	}],
};

function citeRule(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		const choices = Object.keys(ruleGenerators).map((name, index) => ({
			name: `#${index + 1}: ${
				name.toLowerCase().split(' ').map(capitalise).join(' ')
			}`,
			value: index.toString(),
		}));

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

	const displayInvalidRuleError = (): void => {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(
							Commands.cite.strings.invalidRule,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	};

	const indexString = interaction.data?.options?.at(0)?.value;
	if (!indexString) return displayInvalidRuleError();

	const index = Number(indexString);
	if (isNaN(index)) return displayInvalidRuleError();

	const titleRuleTuples = Object.entries(ruleGenerators).at(index);
	if (!titleRuleTuples) return displayInvalidRuleError();

	const [title, generateRule] = titleRuleTuples;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	const rule = generateRule(guild);
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `${title.toUpperCase()} ~ TLDR: *${rule.summary}*`,
					description: rule.content,
					color: configuration.interactions.responses.colors.blue,
				}],
			},
		},
	);
}

export default command;
