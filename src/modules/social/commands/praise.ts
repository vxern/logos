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
import { Praise } from '../../../database/structs/users/praise.ts';
import {
	mentionUser,
	messageUser,
	resolveUserIdentifier,
} from '../../../utils.ts';
import { user } from '../../parameters.ts';

const command: Command = {
	name: 'praise',
	availability: Availability.MEMBERS,
	description: 'Praises a user for their contribution.',
	options: [user, {
		name: 'comment',
		type: ApplicationCommandOptionType.STRING,
		description: 'A comment to attach to the praise.',
	}],
	handle: praise,
};

async function praise(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const data = <InteractionApplicationCommandData> interaction.data;
	const userIdentifier = <string> data.options[0]!.value!;
	const comment = <string | undefined> data.options[1]?.value;

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

	if (member.user.bot) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Invalid user',
				description: 'You cannot praise bots.',
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	if (interaction.user.id === member.id) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Invalid user',
				description: 'You cannot praise yourself!',
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	function showPraiseFailure(): void {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Failed to praise user',
				description: `Your praise failed to be submitted.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
	}

	const author = await client.database.getOrCreateUser(
		'id',
		interaction.user.id,
	);
	if (!author) return showPraiseFailure();

	const praisesByAuthor = await client.database.getPraises(
		'author',
		author.ref,
	);
	if (!praisesByAuthor) return showPraiseFailure();

	const praiseTimestamps = praisesByAuthor
		.map((document) => document.ts)
		.sort((a, b) => b - a); // From most recent to least recent.
	const timestampSlice = praiseTimestamps.slice(
		0,
		configuration.guilds.praises.maximum,
	);
	const canPraise = timestampSlice.length <
			configuration.guilds.praises.maximum ||
		timestampSlice.some((timestamp) =>
			(Date.now() - timestamp) >=
				configuration.guilds.praises.interval
		);
	if (!canPraise) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Wait before praising again',
				description:
					`You have already praised a user recently. You must wait before praising somebody again.`,
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	const subject = await client.database.getOrCreateUser('id', member.id);
	if (!subject) return showPraiseFailure();

	const praise: Praise = {
		author: author.ref,
		subject: subject.ref,
		comment: comment,
	};

	const document = await client.database.createPraise(praise);
	if (!document) return showPraiseFailure();

	messageUser(member.user, interaction.guild!, {
		title: 'You have been praised!',
		description:
			`The user ${interaction.user} has praised you for your contributions.`,
		color: configuration.interactions.responses.colors.green,
	});

	interaction.respond({
		ephemeral: true,
		embeds: [{
			title: 'User praised',
			description:
				`The user has been praised, and they have been notified (if they have their DMs open).`,
			color: configuration.interactions.responses.colors.green,
		}],
	});
}

export default command;
