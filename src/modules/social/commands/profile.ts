import {
	ApplicationCommandOptionType,
	colors,
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
	_client: Client,
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

	if (!member) {
		interaction.respond({
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

	const memberRoles = await member.roles.array().catch(() => {});
	if (!memberRoles) {
		console.error(
			`Failed to fetch roles for member ${
				colors.bold(member.user.username)
			} in guild ${colors.bold(member.guild.name!)}.`,
		);
		return;
	}

	// Remove @everyone role.
	memberRoles.shift();

	const createdAt = dayjs(member.user.timestamp);
	const joinedAt = dayjs(member.joinedAt);

	interaction.respond({
		ephemeral: true,
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
				name: '📅 Created Account',
				value: `${
					createdAt.format('Do [of] MMMM YYYY')
				} (${createdAt.fromNow()})`,
				inline: true,
			}, {
				name: '📅 Joined Server',
				value: `${
					joinedAt.format('Do [of] MMMM YYYY')
				} (${joinedAt.fromNow()})`,
				inline: true,
			}],
		}],
	});
}

export default command;
