import {
	ApplicationCommandFlags,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { ListingResolver } from 'logos/src/commands/music/data/sources/sources.ts';
import { getVoiceState, receiveNewListing, verifyCanRequestPlayback } from 'logos/src/controllers/music.ts';
import { Client, localise } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';

async function handleRequestQueryPlayback(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	resolveToSongListing: ListingResolver,
): Promise<void> {
	const [{ query }] = parseArguments(interaction.data?.options, {});
	if (query === undefined) return;

	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const voiceState = getVoiceState(client, interaction.guildId!, interaction.user.id);

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const canPlay = verifyCanRequestPlayback([client, bot], interaction, controller, voiceState);
	if (!canPlay) return;

	const listing = await resolveToSongListing([client, bot], interaction, query);
	if (listing === undefined) {
		const songNotFoundString = localise(client, 'music.options.play.strings.songNotFound', interaction.locale)();
		const tryDifferentQueryString = localise(
			client,
			'music.options.play.strings.tryDifferentQuery',
			interaction.locale,
		)();

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: `${songNotFoundString}\n\n${tryDifferentQueryString}`,
						color: constants.colors.red,
					}],
				},
			},
		);
	}

	const feedbackChannelId = client.cache.channels.get(interaction.channelId!)?.id;
	if (feedbackChannelId === undefined) return;

	const voiceChannelId = client.cache.channels.get(voiceState!.channelId!)?.id;
	if (voiceChannelId === undefined) return;

	return void receiveNewListing([client, bot], guild, controller, listing, voiceChannelId, feedbackChannelId);
}

export { handleRequestQueryPlayback };
