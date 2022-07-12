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
import {
	mentionUser,
	messageUser,
	resolveUserIdentifier,
} from '../../../utils.ts';
import { user } from '../../parameters.ts';
import { getRelevantWarnings } from '../module.ts';

const command: Command = {
	name: 'unwarn',
	availability: Availability.MODERATORS,
	description: 'Removes the last given warning to a user.',
	handle: unwarn,
	options: [
		user,
		{
			name: 'warning',
			description: 'The warning to remove.',
			required: true,
			autocomplete: true,
			type: ApplicationCommandOptionType.STRING,
		},
	],
};

async function unwarn(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const data = <InteractionApplicationCommandData> interaction.data;

	const userIdentifierOption = data.options[0]!;
	const warningOption = data.options[1]!;

	const [member, matchingMembers] = await resolveUserIdentifier(
		interaction.guild!,
		<string> userIdentifierOption.value!,
	);

	if (interaction.isAutocomplete() && userIdentifierOption.focused) {
		interaction.respond({
			type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
			choices: (member ? [member] : matchingMembers!).map((member) => ({
				name: mentionUser(member.user, true),
				value: member.user.id,
			})),
		});
		return;
	}

	function showUnwarnFailure(): void {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Failed to pardon user',
				description: `The member may have already left the server.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
	}

	if (!member) return showUnwarnFailure();

	function displayEmptyChoices(): void {
		interaction.respond({
			type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
			choices: [],
		});
	}

	const subject = await client.database.getOrCreateUser('id', member.id);
	if (!subject) {
		return interaction.isAutocomplete()
			? displayEmptyChoices()
			: showUnwarnFailure();
	}

	const warnings = await client.database.getWarnings(subject.ref);
	if (!warnings) {
		return interaction.isAutocomplete()
			? displayEmptyChoices()
			: showUnwarnFailure();
	}

	const relevantWarnings = getRelevantWarnings(warnings);
	relevantWarnings.reverse();

	if (interaction.isAutocomplete()) {
		interaction.respond({
			type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
			choices: relevantWarnings.map((warning) => ({
				name: `${warning.data.reason} (${dayjs(warning.ts).fromNow()})`,
				value: warning.ref.value.id,
			})),
		});
		return;
	}

	const warningReferenceID = <string> warningOption.value!;
	const warningToRemove = relevantWarnings.find((warning) =>
		warning.ref.value.id === warningReferenceID
	);
	if (!warningToRemove) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Warning already removed',
				description: `The selected warning has already been removed.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	const warning = await client.database.deleteWarning(warningToRemove);
	if (!warning) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Failed to remove warning',
				description: `The selected warning failed to be removed.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	client.logging.get(interaction.guild!.id)?.log(
		'memberWarnRemove',
		member,
		warning.data,
		interaction.user,
	);

	messageUser(member.user, interaction.guild!, {
		title: 'You have been pardoned',
		description: `The warning for '${warning.data.reason}' given to you ${
			dayjs(warning.ts).fromNow()
		} has been dispelled.`,
		color: configuration.interactions.responses.colors.green,
	}).catch();

	interaction.respond({
		ephemeral: true,
		embeds: [{
			title: 'User pardoned',
			description:
				`The user has been pardoned from their warning for: ${warning.data.reason}`,
			color: configuration.interactions.responses.colors.green,
		}],
	});
}

export default command;
