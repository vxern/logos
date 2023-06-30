import constants from "../../../../../constants.js";
import { Client, localise } from "../../../../client.js";
import { getVoiceState, receiveNewListing, verifyCanRequestPlayback } from "../../../../controllers/music.js";
import { parseArguments, reply } from "../../../../interactions.js";
import { ListingResolver } from "../../data/sources/sources.js";
import { SongListing } from "../../data/types.js";
import { Bot, Interaction } from "discordeno";

async function handleRequestQueryPlayback(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	resolveToSongListing: ListingResolver,
): Promise<void> {
	const [{ query }] = parseArguments(interaction.data?.options, {});
	if (query === undefined) {
		return;
	}

	const listing = await resolveToSongListing([client, bot], interaction, query);
	handleRequestPlayback([client, bot], interaction, listing);
}

async function handleRequestPlayback(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	listing: SongListing | undefined,
): Promise<void> {
	const channelId = interaction.channelId;
	if (channelId === undefined) {
		return;
	}

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const controller = client.features.music.controllers.get(guildId);
	if (controller === undefined) {
		return;
	}

	const voiceState = getVoiceState(client, guildId, interaction.user.id);
	if (voiceState === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const canPlay = verifyCanRequestPlayback([client, bot], interaction, controller, voiceState);
	if (!canPlay) {
		return;
	}

	if (listing === undefined) {
		const strings = {
			title: localise(client, "music.options.play.strings.notFound.title", interaction.locale)(),
			description: {
				notFound: localise(client, "music.options.play.strings.notFound.description.notFound", interaction.locale)(),
				tryDifferentQuery: localise(
					client,
					"music.options.play.strings.notFound.description.tryDifferentQuery",
					interaction.locale,
				)(),
			},
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.notFound}\n\n${strings.description.tryDifferentQuery}`,
					color: constants.colors.red,
				},
			],
		});
		return;
	}

	const feedbackChannelId = client.cache.channels.get(channelId)?.id;
	if (feedbackChannelId === undefined) {
		return;
	}

	const voiceChannelId = voiceState.channelId;
	if (voiceChannelId === undefined) {
		return;
	}

	receiveNewListing([client, bot], guild, controller, listing, voiceChannelId, feedbackChannelId);
}

export { handleRequestPlayback, handleRequestQueryPlayback };
