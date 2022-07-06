import {
	ApplicationCommandOptionType,
	Interaction,
	InteractionApplicationCommandData,
	InteractionResponseType,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { italic } from '../../../formatting.ts';
import rules from '../../secret/data/information/rules.ts';

const command: Command = {
	name: 'cite',
	availability: Availability.MODERATORS,
	description: 'Cites a server rule.',
	options: [{
		name: 'rule',
		type: ApplicationCommandOptionType.STRING,
		required: true,
		autocomplete: true,
	}],
	handle: cite,
};

async function cite(
	_client: Client,
	interaction: Interaction,
): Promise<void> {
	if (interaction.isAutocomplete()) {
		interaction.respond({
			type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
			choices: Object.keys(rules).map((name, index) => ({
				name: name.toUpperCase(),
				value: index.toString(),
			})),
		});
		return;
	}

	const data = interaction.data as InteractionApplicationCommandData;
	const index = Number(data.options[0]!.value!);
	const [title, ruleGenerator] = Object.entries(rules)[index]!;

	const rule = await ruleGenerator(interaction.guild!);

	interaction.respond({
		embeds: [{
			title: `${title.toUpperCase()} ~ TLDR: ${italic(rule.summary)}`,
			description: rule.content,
			color: configuration.interactions.responses.colors.blue,
		}],
	});
}

export default command;
