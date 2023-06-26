import { ApplicationCommandOptionTypes, ApplicationCommandTypes, Bot, Interaction } from 'discordeno';
import { CommandTemplate } from 'logos/src/lib/commands/command.ts';
import { user } from 'logos/src/lib/commands/parameters.ts';
import { logEvent } from 'logos/src/lib/controllers/logging/logging.ts';
import { Praise } from 'logos/src/lib/database/structs/mod.ts';
import { autocompleteMembers, Client, localise, resolveInteractionToMember } from 'logos/src/lib/client.ts';
import { editReply, parseArguments, postponeReply, reply } from 'logos/src/lib/interactions.ts';
import { verifyIsWithinLimits } from 'logos/src/lib/utils.ts';
import configuration from 'logos/src/configuration.ts';
import constants from 'logos/src/constants.ts';
import { mention, MentionTypes } from 'logos/src/formatting.ts';

const command: CommandTemplate = {
	name: 'praise',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handlePraiseUser,
	handleAutocomplete: handlePraiseUserAutocomplete,
	options: [user, {
		name: 'comment',
		type: ApplicationCommandOptionTypes.String,
	}],
};

function handlePraiseUserAutocomplete([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ user }] = parseArguments(interaction.data?.options, {});

	return autocompleteMembers([client, bot], interaction, user!);
}

async function handlePraiseUser([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user, comment }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user);
	if (member === undefined) return;

	if (member.id === interaction.member?.id) {
		const strings = {
			title: localise(client, 'praise.strings.cannotPraiseSelf.title', interaction.locale)(),
			description: localise(client, 'praise.strings.cannotPraiseSelf.description', interaction.locale)(),
		};

		return void reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});
	}

	await postponeReply([client, bot], interaction);

	const [author, subject] = await Promise.all([
		client.database.adapters.users.getOrFetchOrCreate(
			client,
			'id',
			interaction.user.id.toString(),
			interaction.user.id,
		),
		client.database.adapters.users.getOrFetchOrCreate(client, 'id', member.id.toString(), member.id),
	]);

	if (author === undefined || subject === undefined) {
		return showError([client, bot], interaction);
	}

	const praisesBySender = await client.database.adapters.praises.getOrFetch(client, 'sender', author.ref);
	if (praisesBySender === undefined) {
		return showError([client, bot], interaction);
	}

	const praises = Array.from(praisesBySender.values());
	if (!verifyIsWithinLimits(praises, configuration.commands.praise.limitUses, configuration.commands.praise.within)) {
		const strings = {
			title: localise(client, 'praise.strings.tooMany.title', interaction.locale)(),
			description: localise(client, 'praise.strings.tooMany.description', interaction.locale)(),
		};

		return void editReply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});
	}

	const praise: Praise = {
		createdAt: Date.now(),
		sender: author.ref,
		recipient: subject.ref,
		comment: comment,
	};

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const document = await client.database.adapters.praises.create(client, praise);
	if (document === undefined) {
		return showError([client, bot], interaction);
	}

	logEvent([client, bot], guild, 'praiseAdd', [member, praise, interaction.user]);

	const strings = {
		title: localise(client, 'praise.strings.praised.title', interaction.locale)(),
		description: localise(client, 'praise.strings.praised.description', interaction.locale)(
			{ 'user_mention': mention(member.id, MentionTypes.User) },
		),
	};

	return void editReply([client, bot], interaction, {
		embeds: [{
			title: strings.title,
			description: strings.description,
			color: constants.colors.lightGreen,
		}],
	});
}

function showError([client, bot]: [Client, Bot], interaction: Interaction): void {
	const strings = {
		title: localise(client, 'praise.strings.failed.title', interaction.locale)(),
		description: localise(client, 'praise.strings.failed.description', interaction.locale)(),
	};

	return void editReply([client, bot], interaction, {
		embeds: [{
			title: strings.title,
			description: strings.description,
			color: constants.colors.red,
		}],
	});
}

export default command;
