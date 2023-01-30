import {
	ApplicationCommandFlags,
	Bot,
	editMember,
	getDmChannel,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import { log } from 'logos/src/controllers/logging/logging.ts';
import { Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { isAutocomplete, parseArguments } from 'logos/src/interactions.ts';
import { diagnosticMentionUser, guildAsAuthor } from 'logos/src/utils.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

async function handleClearTimeout(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user }, focused] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
	if (member === undefined) return;

	if (isAutocomplete(interaction) && focused?.name === 'user') return;

	const timedOutUntil = member.communicationDisabledUntil ?? undefined;

	const notTimedOut = timedOutUntil === undefined || timedOutUntil < Date.now();

	if (notTimedOut) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.timeout.strings.notTimedOut, interaction.locale),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const [_, dmChannel] = await Promise.all([
		editMember(bot, interaction.guildId!, member.id, { communicationDisabledUntil: null }),
		getDmChannel(bot, member.id).catch(() => undefined),
	]);

	log([client, bot], guild, 'memberTimeoutRemove', member, interaction.user);

	sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: localise(Commands.timeout.strings.timeoutCleared, interaction.locale)(
						diagnosticMentionUser(member.user!),
					),
					color: constants.colors.lightGreen,
				}],
			},
		},
	);

	if (dmChannel !== undefined) {
		return void sendMessage(bot, dmChannel.id, {
			embeds: [
				{
					author: guildAsAuthor(bot, guild),
					description: localise(Commands.timeout.strings.timeoutClearedDirect, defaultLocale),
					color: constants.colors.lightGreen,
				},
			],
		});
	}
}

export { handleClearTimeout };
