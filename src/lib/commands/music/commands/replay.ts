import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { parseArguments, reply } from "../../../interactions";
import { isCollection } from "../../../services/music/music";
import { OptionTemplate } from "../../command";
import { collection } from "../../parameters";

const command: OptionTemplate = {
	name: "replay",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleReplayAction,
	options: [collection],
};

async function handleReplayAction([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.guildLocale;

	const [{ collection }] = parseArguments(interaction.data?.options, { collection: "boolean" });

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.services.music.music.get(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyCanManagePlayback(interaction);
	if (!isVoiceStateVerified) {
		return;
	}

	const [current, isOccupied] = [musicService.current, musicService.isOccupied];
	if (!isOccupied) {
		const locale = interaction.locale;
		const strings = {
			title: localise(client, "music.strings.notPlaying.title", locale)(),
			description: {
				toManage: localise(client, "music.strings.notPlaying.description.toManage", locale)(),
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
			const locale = interaction.locale;
			const strings = {
				title: localise(client, "music.options.replay.strings.noSongCollection.title", locale)(),
				description: {
					noSongCollection: localise(
						client,
						"music.options.replay.strings.noSongCollection.description.noSongCollection",
						locale,
					)(),
					trySongInstead: localise(
						client,
						"music.options.replay.strings.noSongCollection.description.trySongInstead",
						locale,
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
		const locale = interaction.locale;
		const strings = {
			title: localise(client, "music.options.replay.strings.noSong.title", locale)(),
			description: localise(client, "music.options.replay.strings.noSong.description", locale)(),
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

	const strings = {
		title: localise(client, "music.options.replay.strings.replaying.title", locale)(),
		description: localise(client, "music.options.replay.strings.replaying.description", locale)(),
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

	musicService.replay(collection ?? false);
}

export default command;
