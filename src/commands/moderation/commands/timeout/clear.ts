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
import { diagnosticMentionUser, guildAsAuthor, parseArguments } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { defaultLanguage } from 'logos/types.ts';

async function handleClearTimeout(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user);
	if (member === undefined) return;

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
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const [_member, dmChannel] = await Promise.all([
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
					color: configuration.interactions.responses.colors.green,
				}],
			},
		},
	);

	if (dmChannel !== undefined) {
		return void sendMessage(bot, dmChannel.id, {
			embeds: [
				{
					author: guildAsAuthor(bot, guild),
					description: localise(Commands.timeout.strings.timeoutClearedDirect, defaultLanguage),
					color: configuration.interactions.responses.colors.green,
				},
			],
		});
	}
}

export { handleClearTimeout };
