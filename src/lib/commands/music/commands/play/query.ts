import constants from "../../../../../constants.js";
import { Client, localise } from "../../../../client.js";
import { parseArguments, reply } from "../../../../interactions.js";
import { ListingResolver } from "../../data/sources/sources.js";
import { SongListing } from "../../data/types.js";
import * as Discord from "discordeno";

async function handleRequestQueryPlayback(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	resolveToSongListing: ListingResolver,
): Promise<void> {
	const [{ query }] = parseArguments(interaction.data?.options, {});
	if (query === undefined) {
		return;
	}

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.services.music.music.get(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanRequestPlayback(bot, interaction);
	if (isVoiceStateVerified === undefined || !isVoiceStateVerified) {
		return;
	}

	const listing = await resolveToSongListing([client, bot], interaction, query);

	handleRequestPlayback([client, bot], interaction, listing);
}

async function handleRequestPlayback(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	listing: SongListing | undefined,
): Promise<void> {
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

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const musicService = client.services.music.music.get(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanRequestPlayback(bot, interaction);
	if (isVoiceStateVerified === undefined || !isVoiceStateVerified) {
		return;
	}

	const voiceState = guild.voiceStates.get(interaction.user.id);
	const channelId = voiceState?.channelId;
	if (channelId === undefined) {
		return;
	}

	musicService.receiveNewListing(bot, listing, channelId);
}

export { handleRequestPlayback, handleRequestQueryPlayback };
