import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	ApplicationCommandTypes,
	Bot,
	editOriginalInteractionResponse,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { CommandTemplate } from 'logos/src/commands/command.ts';
import { user } from 'logos/src/commands/parameters.ts';
import { logEvent } from 'logos/src/controllers/logging/logging.ts';
import { Praise } from 'logos/src/database/structs/mod.ts';
import { autocompleteMembers, Client, localise, resolveInteractionToMember } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import { verifyIsWithinLimits } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';

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

async function handlePraiseUserAutocomplete([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
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
			cannotPraiseSelf: localise(client, 'praise.strings.cannotPraiseSelf', interaction.locale)(),
		};

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: strings.cannotPraiseSelf,
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	await sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.DeferredChannelMessageWithSource,
		data: { flags: ApplicationCommandFlags.Ephemeral },
	});

	const [author, subject] = await Promise.all([
		client.database.adapters.users.getOrFetchOrCreate(
			client,
			'id',
			interaction.user.id.toString(),
			interaction.user.id,
		),
		client.database.adapters.users.getOrFetchOrCreate(client, 'id', member.id.toString(), member.id),
	]);

	if (author === undefined || subject === undefined) return showError([client, bot], interaction);

	const praisesBySender = await client.database.adapters.praises.getOrFetch(client, 'sender', author.ref);
	if (praisesBySender === undefined) return showError([client, bot], interaction);

	const praises = Array.from(praisesBySender.values());
	if (!verifyIsWithinLimits(praises, configuration.commands.praise.limitUses, configuration.commands.praise.within)) {
		const strings = {
			waitBeforePraising: localise(client, 'praise.strings.waitBeforePraising', interaction.locale)(),
		};

		return void editOriginalInteractionResponse(
			bot,
			interaction.token,
			{
				embeds: [{
					description: strings.waitBeforePraising,
					color: constants.colors.dullYellow,
				}],
			},
		);
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
	if (document === undefined) return showError([client, bot], interaction);

	logEvent([client, bot], guild, 'praiseAdd', [member, praise, interaction.user]);

	const strings = {
		praised: localise(client, 'praise.strings.praised', interaction.locale)(
			{ 'user_mention': mention(member.id, MentionTypes.User) },
		),
	};

	return void editOriginalInteractionResponse(
		bot,
		interaction.token,
		{
			embeds: [{
				description: strings.praised,
				color: constants.colors.lightGreen,
			}],
		},
	);
}

function showError([client, bot]: [Client, Bot], interaction: Interaction): void {
	const strings = {
		failed: localise(client, 'praise.strings.failed', interaction.locale)(),
	};

	return void editOriginalInteractionResponse(
		bot,
		interaction.token,
		{
			embeds: [{
				description: strings.failed,
				color: constants.colors.red,
			}],
		},
	);
}

export default command;
