import {
	ApplicationCommandOptionType,
	dayjs,
	Interaction,
	InteractionApplicationCommandData,
	InteractionResponseType,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { list } from '../../../formatting.ts';
import {
	chunk,
	mentionUser,
	paginate,
	resolveUserIdentifier,
	trim,
} from '../../../utils.ts';
import { user } from '../../parameters.ts';

const command: Command = {
	name: 'list',
	availability: Availability.MODERATORS,
	options: [{
		name: 'warnings',
		description: 'Lists the warnings issued to a user.',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		handle: warnings,
		options: [user],
	}],
};

async function warnings(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const data = <InteractionApplicationCommandData> interaction.data;
	const userIdentifier = <string> data.options[0]!.options![0]!.value!;

	const [member, matchingMembers] = await resolveUserIdentifier(
		interaction.guild!,
		userIdentifier,
	);

	if (interaction.isAutocomplete()) {
		interaction.respond({
			type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
			choices: (member ? [member] : matchingMembers!).map((member) => ({
				name: mentionUser(member.user, true),
				value: member.user.id,
			})),
		});
		return;
	}

	function showListFailure(): void {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Failed to display warnings',
				description: `The warnings for the given user could not be shown.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
	}

	if (!member) return showListFailure();

	const subject = await client.database.getOrCreateUser('id', member.id);
	if (!subject) return showListFailure();

	const warnings = await client.database.getWarnings(subject.ref);
	if (!warnings) return showListFailure();

	const pages = chunk(
		warnings,
		configuration.interactions.responses.resultsPerPage,
	);

	paginate({
		interaction: interaction,
		elements: pages,
		embed: { color: configuration.interactions.responses.colors.blue },
		view: {
			title: 'Warnings',
			generate: (warnings) =>
				warnings.length === 0
					? `This user hasn't received any warnings.`
					: list(
						warnings.map((warning) =>
							`${trim(warning.data.reason, 50)} (${
								dayjs(warning.ts).fromNow()
							})`
						),
					),
		},
		show: false,
	});
}

export default command;
