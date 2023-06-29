import { Bot, Interaction } from "discordeno";
import { ListingResolver } from "../../data/sources/sources.js";
import { SongListing } from "../../data/types.js";
import { getVoiceState, receiveNewListing, verifyCanRequestPlayback } from "../../../../controllers/music.js";
import { Client, localise } from "../../../../client.js";
import { parseArguments, reply } from "../../../../interactions.js";
import constants from "../../../../../constants.js";

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
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) {
		return;
	}

	const voiceState = getVoiceState(client, interaction.guildId!, interaction.user.id);

	const guild = client.cache.guilds.get(interaction.guildId!);
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

	const feedbackChannelId = client.cache.channels.get(interaction.channelId!)?.id;
	if (feedbackChannelId === undefined) {
		return;
	}

	const voiceChannelId = client.cache.channels.get(voiceState!.channelId!)?.id;
	if (voiceChannelId === undefined) {
		return;
	}

	receiveNewListing([client, bot], guild, controller, listing, voiceChannelId, feedbackChannelId);
}

export { handleRequestPlayback, handleRequestQueryPlayback };
