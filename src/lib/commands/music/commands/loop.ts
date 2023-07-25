import constants from "../../../../constants/constants";
import { defaultLocale } from "../../../../constants/language";
import { Client, localise } from "../../../client";
import { parseArguments, reply } from "../../../interactions";
import { isCollection } from "../../../services/music/music";
import { OptionTemplate } from "../../command";
import { collection } from "../../parameters";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "loop",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleLoopPlayback,
	options: [collection],
};

async function handleLoopPlayback(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ collection }] = parseArguments(interaction.data?.options, { collection: "boolean" });

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.services.music.music.get(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanManagePlayback(bot, interaction);
	if (isVoiceStateVerified === undefined || !isVoiceStateVerified) {
		return;
	}

	const [current, isOccupied] = [musicService.current, musicService.isPaused];
	if (current === undefined || isOccupied === undefined) {
		return;
	}

	if (collection) {
		if (!isOccupied || current === undefined) {
			const strings = {
				title: localise(client, "music.options.loop.strings.noSongCollection.title", interaction.locale)(),
				description: {
					noSongCollection: localise(
						client,
						"music.options.loop.strings.noSongCollection.description.noSongCollection",
						interaction.locale,
					)(),
				},
			};

			reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description.noSongCollection,
						color: constants.colors.dullYellow,
					},
				],
			});
			return;
		} else if (!isCollection(current.content)) {
			const strings = {
				title: localise(client, "music.options.loop.strings.noSongCollection.title", interaction.locale)(),
				description: {
					noSongCollection: localise(
						client,
						"music.options.loop.strings.noSongCollection.description.noSongCollection",
						interaction.locale,
					)(),
					trySongInstead: localise(
						client,
						"music.options.loop.strings.noSongCollection.description.trySongInstead",
						interaction.locale,
					)(),
				},
			};

			reply([client, bot], interaction, {
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
	} else {
		if (!isOccupied || current === undefined) {
			const strings = {
				title: localise(client, "music.options.loop.strings.noSong.title", interaction.locale)(),
				description: localise(client, "music.options.loop.strings.noSong.description", interaction.locale)(),
			};

			reply([client, bot], interaction, {
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
	}

	if (collection) {
		const isLooped = musicService.loop(true);
		if (isLooped === undefined) {
			return;
		}

		if (!isLooped) {
			const strings = {
				title: localise(client, "music.options.loop.strings.disabled.title", defaultLocale)(),
				description: localise(
					client,
					"music.options.loop.strings.disabled.description.songCollection",
					defaultLocale,
				)(),
			};

			reply([client, bot], interaction, {
				embeds: [
					{
						title: `${constants.symbols.music.loopDisabled} ${strings.title}`,
						description: strings.description,
						color: constants.colors.blue,
					},
				],
			});
			return;
		}

		const strings = {
			title: localise(client, "music.options.loop.strings.enabled.title", defaultLocale)(),
			description: localise(client, "music.options.loop.strings.enabled.description.songCollection", defaultLocale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: `${constants.symbols.music.loopEnabled} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		});
		return;
	}

	const isLooped = musicService.loop(false);
	if (isLooped === undefined) {
		return;
	}

	if (!isLooped) {
		const strings = {
			title: localise(client, "music.options.loop.strings.disabled.title", defaultLocale)(),
			description: localise(client, "music.options.loop.strings.disabled.description.song", defaultLocale)(),
		};

		reply(
			[client, bot],
			interaction,
			{
				embeds: [
					{
						title: `${constants.symbols.music.loopDisabled} ${strings.title}`,
						description: strings.description,
						color: constants.colors.blue,
					},
				],
			},
			{ visible: true },
		);
		return;
	}

	const strings = {
		title: localise(client, "music.options.loop.strings.enabled.title", defaultLocale)(),
		description: localise(client, "music.options.loop.strings.enabled.description.song", defaultLocale)(),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.loopEnabled} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);
}

export default command;
