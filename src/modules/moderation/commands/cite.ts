import {
	ApplicationCommandOptionTypes,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import rules from '../../secret/data/information/rules.ts';

const command: CommandBuilder = {
	name: 'cite',
	nameLocalizations: {
		pl: 'zacytuj',
		ro: 'citează',
	},
	description: 'Cites a server rule.',
	descriptionLocalizations: {
		pl: 'Cytuje jedną z reguł serwera.',
		ro: 'Citează una dintre regulile serverului.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
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
	handle: citeRule,
};

async function citeRule(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: {
					choices: Object.keys(rules).map((name, index) => ({
						name: name.toUpperCase(),
						value: index.toString(),
					})),
				},
			},
		);
	}

	const data = interaction.data;
	if (!data) return;

	const indexString = data.options?.at(0)?.value;
	if (!indexString) return;

	const index = Number(indexString);
	if (isNaN(index)) return;

	const titleRuleTuples = Object.entries(rules)[index];
	if (!titleRuleTuples) return;

	const [title, ruleGenerator] = titleRuleTuples;

	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	const rule = await ruleGenerator(guild);

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
