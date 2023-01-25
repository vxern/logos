import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { ListingResolver, sources } from 'logos/src/commands/music/data/sources/sources.ts';
import { SongListingContentTypes } from 'logos/src/commands/music/data/types.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { query } from 'logos/src/commands/parameters.ts';
import { getVoiceState, receiveNewListing, verifyCanRequestPlayback } from 'logos/src/controllers/music.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.music.options.play),
	type: ApplicationCommandOptionTypes.SubCommandGroup,
	options: [
		{
			...createLocalisations(Commands.music.options.play.options.file),
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: handleRequestExternal,
			options: [{
				...createLocalisations(
					Commands.music.options.play.options.file.options.url,
				),
				type: ApplicationCommandOptionTypes.String,
				required: true,
			}],
		},
		...Object.entries(sources).map<OptionBuilder>(([name, resolve]) => ({
			...createLocalisations(Commands.music.options.play.options.source(name)),
			type: ApplicationCommandOptionTypes.SubCommand,
			handle: ([client, bot], interaction) => handleRequestSongListing([client, bot], interaction, resolve),
			options: [query],
		})),
	],
};

function handleRequestExternal(
	clientWithBot: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	return handleRequestSongListing(
		clientWithBot,
		interaction,
		(_, interaction, query) =>
			new Promise((resolve) =>
				resolve({
					requestedBy: interaction.user.id,
					managerIds: [],
					content: {
						type: SongListingContentTypes.External,
						title: localise(Commands.music.options.play.strings.externalFile, interaction.locale),
						url: query,
					},
				})
			),
	);
}

async function handleRequestSongListing(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	resolveToSongListing: ListingResolver,
): Promise<void> {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const [{ query }] = parseArguments(interaction.data?.options, {});
	if (query === undefined) return;

	const voiceState = getVoiceState(client, interaction.guildId!, interaction.user.id);

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const canPlay = verifyCanRequestPlayback(bot, interaction, controller, voiceState);
	if (!canPlay) return;

	const listing = await resolveToSongListing([client, bot], interaction, query);
	if (listing === undefined) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.options.play.strings.songNotFound, interaction.locale),
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

export { handleRequestSongListing };
export default command;
