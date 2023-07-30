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
	if (!isVoiceStateVerified) {
		return;
	}

	const [current, isOccupied] = [musicService.current, musicService.isOccupied];
	if (!isOccupied) {
		const strings = {
			title: localise(client, "music.strings.notPlaying.title", interaction.locale)(),
			description: {
				toManage: localise(client, "music.strings.notPlaying.description.toManage", interaction.locale)(),
			},
		};

		reply([client, bot], interaction, {
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
	} else if (current?.content === undefined) {
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
