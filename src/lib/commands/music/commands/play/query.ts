import { Client } from "../../../../client";
import { ListingResolver } from "../../data/sources/sources";
import { SongListing } from "../../data/types";

async function handleRequestQueryPlayback(
	client: Client,
	interaction: Logos.Interaction<any, { query: string }>,
	resolveToSongListing: ListingResolver,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.getMusicService(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanRequestPlayback(interaction);
	if (!isVoiceStateVerified) {
		return;
	}

	const listing = await resolveToSongListing(client, interaction, interaction.parameters.query);

	await handleRequestPlayback(client, interaction, listing);
}

async function handleRequestPlayback(
	client: Client,
	interaction: Logos.Interaction,
	listing: SongListing | undefined,
): Promise<void> {
	const locale = interaction.locale;

	if (listing === undefined) {
		const strings = {
			title: client.localise("music.options.play.strings.notFound.title", locale)(),
			description: {
				notFound: client.localise("music.options.play.strings.notFound.description.notFound", locale)(),
				tryDifferentQuery: client.localise(
					"music.options.play.strings.notFound.description.tryDifferentQuery",
					locale,
				)(),
			},
		};

		await client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.notFound}\n\n${strings.description.tryDifferentQuery}`,
					color: constants.colours.dullYellow,
				},
			],
		});

		return;
	}

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const musicService = client.getMusicService(guildId);
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

	await musicService.receiveNewListing(listing, channelId);
}

export { handleRequestPlayback, handleRequestQueryPlayback };
