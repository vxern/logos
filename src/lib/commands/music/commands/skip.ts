import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { parseArguments, reply } from "../../../interactions";
import { isCollection } from "../../../services/music/music";
import { OptionTemplate } from "../../command";
import { by, collection, to } from "../../parameters";

const command: OptionTemplate = {
	id: "skip",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleSkipAction,
	options: [collection, by, to],
};

async function handleSkipAction(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.guildLocale;

	const [{ collection, by: songsToSkip, to: songToSkipTo }] = parseArguments(interaction.data?.options, {
		collection: "boolean",
		by: "number",
		to: "number",
	});
	if (songsToSkip !== undefined && !Number.isSafeInteger(songsToSkip)) {
		return;
	}
	if (songToSkipTo !== undefined && !Number.isSafeInteger(songToSkipTo)) {
		return;
	}

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.getMusicService(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanManagePlayback(interaction);
	if (!isVoiceStateVerified) {
		return;
	}

	const [isOccupied, current, queue] = [musicService.isOccupied, musicService.current, musicService.queue];
	if (!isOccupied || current === undefined || queue === undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.notPlaying.title", locale)(),
			description: {
				toManage: client.localise("music.strings.notPlaying.description.toManage", locale)(),
			},
		};

		reply(client, interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description.toManage,
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	if (collection) {
		if (current?.content === undefined || !isCollection(current.content)) {
			const locale = interaction.locale;
			const strings = {
				title: client.localise("music.options.skip.strings.noSongCollection.title", locale)(),
				description: {
					noSongCollection: client.localise(
						"music.options.skip.strings.noSongCollection.description.noSongCollection",
						locale,
					)(),
					trySongInstead: client.localise(
						"music.options.skip.strings.noSongCollection.description.trySongInstead",
						locale,
					)(),
				},
			};

			reply(client, interaction, {
				embeds: [
					{
						title: strings.title,
						description: `${strings.description.noSongCollection}\n\n${strings.description.trySongInstead}`,
						color: constants.colors.dullYellow,
					},
				],
			});
			return;
		}
	} else if (current?.content === undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.skip.strings.noSong.title", locale)(),
			description: client.localise("music.options.skip.strings.noSong.description", locale)(),
		};

		reply(client, interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	// If both the 'to' and the 'by' parameter have been supplied.
	if (songsToSkip !== undefined && songToSkipTo !== undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.skips.tooManyArguments.title", locale)(),
			description: client.localise("music.strings.skips.tooManyArguments.description", locale)(),
		};

		reply(client, interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});
		return;
	}

	// If either the 'to' parameter or the 'by' parameter are negative.
	if ((songsToSkip !== undefined && songsToSkip <= 0) || (songToSkipTo !== undefined && songToSkipTo <= 0)) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.skips.invalid.title", locale)(),
			description: client.localise("music.strings.skips.invalid.description", locale)(),
		};

		reply(client, interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});
		return;
	}

	const isSkippingCollection = collection ?? false;

	const strings =
		collection ?? false
			? {
					title: client.localise("music.options.skip.strings.skippedSongCollection.title", locale)(),
					description: client.localise("music.options.skip.strings.skippedSongCollection.description", locale)(),
			  }
			: {
					title: client.localise("music.options.skip.strings.skippedSong.title", locale)(),
					description: client.localise("music.options.skip.strings.skippedSong.description", locale)(),
			  };

	reply(
		client,
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.skipped} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);

	if (songsToSkip !== undefined) {
		let listingsToSkip!: number;
		if (isCollection(current.content) && collection === undefined) {
			listingsToSkip = Math.min(songsToSkip, current.content.songs.length - (current.content.position + 1));
		} else {
			listingsToSkip = Math.min(songsToSkip, queue.length);
		}
		musicService.skip(isSkippingCollection, { by: listingsToSkip });
	} else if (songToSkipTo !== undefined) {
		let listingToSkipTo!: number;
		if (isCollection(current.content) && collection === undefined) {
			listingToSkipTo = Math.min(songToSkipTo, current.content.songs.length);
		} else {
			listingToSkipTo = Math.min(songToSkipTo, queue.length);
		}
		musicService.skip(isSkippingCollection, { to: listingToSkipTo });
	} else {
		musicService.skip(isSkippingCollection, {});
	}
}

export default command;
