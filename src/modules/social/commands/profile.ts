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
import { mention } from '../../../formatting.ts';
import { mentionUser, resolveUserIdentifier } from '../../../utils.ts';
import { user } from '../../parameters.ts';

const command: Command = {
	name: 'profile',
	availability: Availability.MEMBERS,
	description:
		'Allows the user to view information about themselves or another user.',
	options: [{
		name: 'view',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		description: 'Displays a user\'s profile.',
		options: [user],
		handle: viewProfile,
	}],
};

async function viewProfile(
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

  interaction.defer(true);

	if (!member) {
		interaction.editResponse({
			ephemeral: true,
			embeds: [{
				title: 'Invalid user',
				description:
					'The provided user identifier is invalid, and does not match to a guild member.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	function showProfileViewFailure(): void {
		interaction.editResponse({
			ephemeral: true,
			embeds: [{
				title: 'Failed to show profile',
				description: 'Failed to show information about the chosen member.',
				color: configuration.interactions.responses.colors.red,
			}],
		});
	}

	const memberRoles = await member.roles.array().catch(() => {});
	if (!memberRoles) return showProfileViewFailure();

	// Remove @everyone role.
	memberRoles.shift();

	const createdAt = dayjs(member.user.timestamp);
	const joinedAt = dayjs(member.joinedAt);

	const subject = await client.database.getOrCreateUser('id', member.id);
	if (!subject) return showProfileViewFailure();

	const praisesReceived = await client.database.getPraises(
		'subject',
		subject.ref,
	);
	if (!praisesReceived) return showProfileViewFailure();

	const praisesGiven = await client.database.getPraises('author', subject.ref);
	if (!praisesGiven) return showProfileViewFailure();

	const warnings = await client.database.getWarnings(subject.ref);
	if (!warnings) return showProfileViewFailure();

	interaction.editResponse({
		embeds: [{
			title: `Information for ${member.user.username}`,
			thumbnail: {
				url: member.avatarURL('webp', 1024),
			},
			fields: [{
				name: '💼 Roles',
				value: memberRoles.map((role) => mention(role.id, 'ROLE')).join(' '),
				inline: false,
			}, {
				name: '📅 Dates',
				value: `Joined server: ${
					joinedAt.format('Do [of] MMMM YYYY')
				} (${joinedAt.fromNow()})\nCreated account: ${
					createdAt.format('Do [of] MMMM YYYY')
				} (${createdAt.fromNow()})`,
				inline: false,
			}, {
				name: '🙏 Praises',
				value:
					`Received: ${praisesReceived.length}\nGiven: ${praisesGiven.length}`,
				inline: true,
			}, {
				name: `😖 Warnings`,
				value: `Received: ${warnings.length}`,
				inline: true,
			}],
		}],
	});
}

export default command;
