import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
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
	name: 'cite',
	nameLocalizations: {
		pl: 'zacytuj',
		ro: 'citare',
	},
	description: 'Cites a server rule.',
	descriptionLocalizations: {
		pl: 'Cytuje jedną z reguł serwera.',
		ro: 'Citează una dintre regulile serverului.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: citeRule,
	options: [{
		name: 'rule',
		nameLocalizations: {
			pl: 'reguła',
			ro: 'regulă',
		},
		description: 'The rule to cite.',
		descriptionLocalizations: {
			pl: 'Reguła, która ma być zacytowana.',
			ro: 'Regula care să fie citată.',
		},
		type: ApplicationCommandOptionTypes.String,
		required: true,
		autocomplete: true,
	}],
};

function citeRule(
	client: Client,
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
			client.bot,
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
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: 'Invalid rule.',
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

	const titleRuleTuples = Object.entries(ruleGenerators)[index];
	if (!titleRuleTuples) return displayInvalidRuleError();

	const [title, generateRule] = titleRuleTuples;

	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	const rule = generateRule(guild);
	return void sendInteractionResponse(
		client.bot,
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
