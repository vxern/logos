import constants from "../../../../constants/constants";
import { defaultLocale } from "../../../../constants/language";
import { Client, localise } from "../../../client";
import { parseArguments, reply } from "../../../interactions";
import { isCollection } from "../../../services/music/music";
import { OptionTemplate } from "../../command";
import { collection } from "../../parameters";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "replay",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleReplayAction,
	options: [collection],
};

async function handleReplayAction(
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

	const [current, isOccupied] = [musicService.current, musicService.isOccupied];
	if (current === undefined || isOccupied === undefined) {
		return;
	}

	if (collection) {
		if (!isOccupied || current === undefined) {
			const strings = {
				title: localise(client, "music.options.replay.strings.noSongCollection.title", interaction.locale)(),
				description: {
					noSongCollection: localise(
						client,
						"music.options.replay.strings.noSongCollection.description.noSongCollection",
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
				title: localise(client, "music.options.replay.strings.noSongCollection.title", interaction.locale)(),
				description: {
					noSongCollection: localise(
						client,
						"music.options.replay.strings.noSongCollection.description.noSongCollection",
						interaction.locale,
					)(),
					trySongInstead: localise(
						client,
						"music.options.replay.strings.noSongCollection.description.trySongInstead",
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
				title: localise(client, "music.options.replay.strings.noSong.title", interaction.locale)(),
				description: localise(client, "music.options.replay.strings.noSong.description", interaction.locale)(),
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

	musicService.replay(bot, collection ?? false);

	const strings = {
		title: localise(client, "music.options.replay.strings.replaying.title", defaultLocale)(),
		description: localise(client, "music.options.replay.strings.replaying.description", defaultLocale)(),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.replaying} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);
}

export default command;
