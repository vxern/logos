import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	editOriginalInteractionResponse,
	getDmChannel,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { user } from 'logos/src/commands/parameters.ts';
import { log } from 'logos/src/controllers/logging/logging.ts';
import { Praise } from 'logos/src/database/structs/mod.ts';
import { Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import { guildAsAuthor, verifyIsWithinLimits } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.praise),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handlePraiseUser,
	options: [user, {
		...createLocalisations(Commands.praise.options.comment),
		type: ApplicationCommandOptionTypes.String,
	}],
};

async function handlePraiseUser(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user, comment }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user);
	if (member === undefined) return;

	if (member.id === interaction.member?.id) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.praise.strings.cannotPraiseSelf, interaction.locale),
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

	if (author === undefined || subject === undefined) return showError(bot, interaction);

	const praisesBySender = await client.database.adapters.praises.getOrFetch(client, 'sender', author.ref);
	if (praisesBySender === undefined) return showError(bot, interaction);

	const praises = Array.from(praisesBySender.values());
	if (!verifyIsWithinLimits(praises, configuration.commands.praise.limit, configuration.commands.praise.within)) {
		return void editOriginalInteractionResponse(
			bot,
			interaction.token,
			{
				embeds: [{
					description: localise(Commands.praise.strings.waitBeforePraising, interaction.locale),
					color: constants.colors.dullYellow,
				}],
			},
		);
	}

	const praise: Praise = { sender: author.ref, recipient: subject.ref, comment: comment };

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const [document, dmChannel] = await Promise.all([
		client.database.adapters.praises.create(client, praise),
		getDmChannel(bot, member.id).catch(() => undefined),
	]);
	if (document === undefined) return showError(bot, interaction);

	log([client, bot], guild, 'praiseAdd', member, praise, interaction.user);

	if (dmChannel !== undefined) {
		const praisedString = localise(Commands.praise.strings.praisedDirect, interaction.locale)(
			mention(interaction.user.id, MentionTypes.User),
		);

		sendMessage(bot, dmChannel.id, {
			embeds: [
				{
					author: guildAsAuthor(bot, guild),
					description: `${praisedString} 🥳`,
					color: constants.colors.lightGreen,
				},
			],
		});
	}

	return void editOriginalInteractionResponse(
		bot,
		interaction.token,
		{
			embeds: [{
				description: localise(Commands.praise.strings.praised, interaction.locale)(
					mention(member.id, MentionTypes.User),
				),
				color: constants.colors.lightGreen,
			}],
		},
	);
}

function showError(bot: Bot, interaction: Interaction): void {
	return void editOriginalInteractionResponse(
		bot,
		interaction.token,
		{
			embeds: [{
				description: localise(Commands.praise.strings.failed, interaction.locale),
				color: constants.colors.red,
			}],
		},
	);
}

export default command;
