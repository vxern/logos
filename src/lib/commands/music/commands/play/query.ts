import constants from "../../../../../constants/constants";
import * as Logos from "../../../../../types";
import { Client, localise } from "../../../../client";
import { parseArguments, reply } from "../../../../interactions";
import { ListingResolver } from "../../data/sources/sources";
import { SongListing } from "../../data/types";
import * as Discord from "@discordeno/bot";

async function handleRequestQueryPlayback(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
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

	const isVoiceStateVerified = musicService.verifyCanRequestPlayback(interaction);
	if (!isVoiceStateVerified) {
		return;
	}

	const listing = await resolveToSongListing([client, bot], interaction, query);

	handleRequestPlayback([client, bot], interaction, listing);
}

async function handleRequestPlayback(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	listing: SongListing | undefined,
): Promise<void> {
	const locale = interaction.locale;

	if (listing === undefined) {
		const strings = {
			title: localise(client, "music.options.play.strings.notFound.title", locale)(),
			description: {
				notFound: localise(client, "music.options.play.strings.notFound.description.notFound", locale)(),
				tryDifferentQuery: localise(
					client,
					"music.options.play.strings.notFound.description.tryDifferentQuery",
					locale,
				)(),
			},
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.notFound}\n\n${strings.description.tryDifferentQuery}`,
					color: constants.colors.dullYellow,
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

	const isVoiceStateVerified = musicService.verifyCanRequestPlayback(interaction);
	if (!isVoiceStateVerified) {
		return;
	}

	const voiceState = guild.voiceStates.get(interaction.user.id);
	const channelId = voiceState?.channelId;
	if (channelId === undefined) {
		return;
	}

	musicService.receiveNewListing(listing, channelId);
}

export { handleRequestPlayback, handleRequestQueryPlayback };
