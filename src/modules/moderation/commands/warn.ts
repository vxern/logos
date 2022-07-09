import {
	Interaction,
	InteractionApplicationCommandData,
	InteractionResponseType,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { mention } from '../../../formatting.ts';
import { mentionUser, messageUser } from '../../../utils.ts';
import { user } from '../../parameters.ts';
import { getRelevantWarnings, resolveUserIdentifier } from '../module.ts';
import { reason } from '../parameters.ts';

const command: Command = {
	name: 'warn',
	availability: Availability.MODERATORS,
	description: 'Warns the user.',
	options: [user, reason],
	handle: warn,
};

async function warn(client: Client, interaction: Interaction): Promise<void> {
	const data = <InteractionApplicationCommandData> interaction.data;

	const userIdentifier = <string> data.options[0]!.value!;
	const reason = <string> data.options[1]!.value!;

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

	const isGuide = !!(await member.roles.array()).find((role) =>
		role.name === configuration.guilds.moderation.enforcer
	);

	if (member.user.bot || isGuide) {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Invalid user',
				description:
					`Bots and server ${configuration.guilds.moderation.enforcer.toLowerCase()}s cannot be warned.`,
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
		return;
	}

	function showWarnFailure(interaction: Interaction): void {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Failed to warn user',
				description: `Your warning failed to be submitted.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
	}

	const subject = await client.database.getOrCreateUser('id', member!.user.id);
	if (!subject) return showWarnFailure(interaction);

	const author = await client.database.getOrCreateUser(
		'id',
		interaction.user.id,
	);
	if (!author) return showWarnFailure(interaction);

	const warnings = await client.database.getWarnings(subject.ref);
	if (!warnings) return showWarnFailure(interaction);

	const document = await client.database.createWarning({
		author: author.ref,
		subject: subject.ref,
		reason: reason,
	});
	if (!document) return showWarnFailure(interaction);

	const relevantWarnings = getRelevantWarnings(warnings);

	const passedMaximum =
		relevantWarnings.length > configuration.guilds.moderation.warnings.maximum;

	let messageSent = true;
	if (passedMaximum) {
		await messageUser(member!.user, interaction.guild!, {
			title: 'You have been kicked',
			description:
				`You have received a warning for: ${reason}\n\nYou have surpassed the maximum number of warnings, and have subsequently been kicked.`,
			color: configuration.interactions.responses.colors.red,
		}).catch();

		member!.kick(reason);
	} else {
		messageUser(member!.user, interaction.guild!, {
			title: 'You have been warned',
			description:
				`You have received a warning for: ${reason}\n\nThis is warning ${relevantWarnings.length}/${configuration.guilds.moderation.warnings.maximum}.`,
			color: configuration.interactions.responses.colors.yellow,
		}).catch(() => messageSent = false);
	}

	client.logging.get(interaction.guild!.id)?.log(
		'memberWarnAdd',
		member!,
		document.data,
		interaction.user,
	);

	interaction.respond({
		ephemeral: true,
		embeds: [{
			title: 'Member warned',
			description: `Member ${
				mention(member!.id, 'USER')
			} has been warned. They now have ${relevantWarnings.length} warnings.`,
			color: configuration.interactions.responses.colors.blue,
		}],
	});

	if (messageSent) return;

	interaction.channel!.send({
		embeds: [{
			description: `${
				mention(member!.id, 'USER')
			} has been warned for: ${document.data.reason}\n\n${
				passedMaximum
					? 'They have passed the maximum number of warnings, and have been kicked.'
					: `This is warning ${relevantWarnings.length}/${configuration.guilds.moderation.warnings.maximum}.`
			}`,
			color: configuration.interactions.responses.colors.yellow,
		}],
	});
}

export default command;
