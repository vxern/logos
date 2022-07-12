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
import configuration, { minute, week } from '../../../configuration.ts';
import { mention } from '../../../formatting.ts';
import {
	mentionUser,
	messageUser,
	resolveUserIdentifier,
} from '../../../utils.ts';
import { user } from '../../parameters.ts';
import { getTimestampFromExpression } from '../module.ts';
import { duration, reason } from '../parameters.ts';

const command: Command = {
	name: 'timeout',
	availability: Availability.MODERATORS,
	options: [{
		name: 'set',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		description:
			'Times out a user, making them unable to interact on the server.',
		options: [user, duration, reason],
		handle: setTimeout,
	}, {
		name: 'clear',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		description: `Clear's a user's timeout.`,
		options: [user],
		handle: clearTimeout,
	}],
	handle: setTimeout,
};

async function setTimeout(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const data = <InteractionApplicationCommandData> interaction.data;
	const options = data.options[0]!.options!;

	const userIdentifierOption = options.find((option) => option.name === 'user');
	const durationIdentifier = <string> options.find((option) =>
		option.name === 'duration'
	)?.value;
	const reason = <string> options.find((option) => option.name === 'reason')!
		.value!;

	const [member, matchingMembers] = !userIdentifierOption
		? [undefined, undefined]
		: await resolveUserIdentifier(
			interaction.guild!,
			<string> userIdentifierOption.value!,
		);

	if (interaction.isAutocomplete()) {
		if (userIdentifierOption?.focused) {
			interaction.respond({
				type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
				choices: (member ? [member] : matchingMembers!).map((member) => ({
					name: mentionUser(member.user, true),
					value: member.user.id,
				})),
			});
			return;
		}

		const timestamp = getTimestampFromExpression(durationIdentifier);

		interaction.respond({
			type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
			choices: !timestamp
				? []
				: [{ name: timestamp[0], value: timestamp[1].toString() }],
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

	const duration = Number(durationIdentifier);

	if (Number.isNaN(duration)) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Invalid timestamp',
				description: 'The provided duration is invalid.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	if (duration < minute) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Invalid timestamp',
				description: 'The duration must be longer than a minute.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	if (duration > week) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Invalid timestamp',
				description: 'The duration must not be longer than a week.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	const until = new Date(Date.now() + duration);

	member.setTimeout(until, reason);

	let messageSent = true;
	if (!member.communicationDisabledUntil) {
		const message = await messageUser(member!.user, interaction.guild!, {
			title: 'You have been timed out',
			description: `You have been timed out for a duration of ${
				dayjs(until).fromNow(true)
			} for: ${reason}`,
			color: configuration.interactions.responses.colors.yellow,
		});
		messageSent = !!message;
	}

	client.logging.get(interaction.guild!.id)?.log(
		'memberTimeoutAdd',
		member,
		until,
		reason,
		interaction.user,
	);

	interaction.respond({
		ephemeral: true,
		embeds: [{
			title: 'Member timed out',
			description: `Member ${
				mention(member!.id, 'USER')
			} has been timed out for a duration of ${dayjs(until).fromNow(true)}.`,
			color: configuration.interactions.responses.colors.blue,
		}],
	});

	if (messageSent) return;

	interaction.channel!.send({
		embeds: [{
			description: `${
				mention(member!.id, 'USER')
			} has been timed out for a duration of ${
				dayjs(until).fromNow(true)
			} for: ${reason}`,
			color: configuration.interactions.responses.colors.yellow,
		}],
	});
}

async function clearTimeout(
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

	if (!member.communicationDisabledUntil) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'User not timed out',
				description: 'The provided user is not currently timed out.',
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	member.resetTimeout().catch();

	client.logging.get(interaction.guild!.id)?.log(
		'memberTimeoutRemove',
		member,
		interaction.user,
	);

	interaction.respond({
		ephemeral: true,
		embeds: [{
			title: 'Cleared user timeout',
			description: `The timeout of member ${
				mentionUser(member.user)
			} has been cleared.`,
			color: configuration.interactions.responses.colors.blue,
		}],
	});
}

export default command;
