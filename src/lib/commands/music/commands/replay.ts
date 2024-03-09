import { Client } from "../../../client";
import { isCollection } from "../../../services/music/music";
import { OptionTemplate } from "../../command";
import { collection } from "../../parameters";

const command: OptionTemplate = {
	id: "replay",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleReplayAction,
	options: [collection],
};

async function handleReplayAction(
	client: Client,
	interaction: Logos.Interaction<any, { collection: boolean | undefined }>,
): Promise<void> {
	const locale = interaction.guildLocale;

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

	const [current, isOccupied] = [musicService.current, musicService.isOccupied];
	if (!isOccupied) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.notPlaying.title", locale)(),
			description: {
				toManage: client.localise("music.strings.notPlaying.description.toManage", locale)(),
			},
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description.toManage,
					color: constants.colours.dullYellow,
				},
			],
		});
		return;
	}

	if (interaction.parameters.collection) {
		if (current?.content === undefined || !isCollection(current.content)) {
			const locale = interaction.locale;
			const strings = {
				title: client.localise("music.options.replay.strings.noSongCollection.title", locale)(),
				description: {
					noSongCollection: client.localise(
						"music.options.replay.strings.noSongCollection.description.noSongCollection",
						locale,
					)(),
					trySongInstead: client.localise(
						"music.options.replay.strings.noSongCollection.description.trySongInstead",
						locale,
					)(),
				},
			};

			client.reply(interaction, {
				embeds: [
					{
						title: strings.title,
						description: `${strings.description.noSongCollection}\n\n${strings.description.trySongInstead}`,
						color: constants.colours.dullYellow,
					},
				],
			});
			return;
		}
	} else if (current?.content === undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.replay.strings.noSong.title", locale)(),
			description: client.localise("music.options.replay.strings.noSong.description", locale)(),
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
				},
			],
		});
		return;
	}

	const strings = {
		title: client.localise("music.options.replay.strings.replaying.title", locale)(),
		description: client.localise("music.options.replay.strings.replaying.description", locale)(),
	};

	client.reply(
		interaction,
		{
			embeds: [
				{
					title: `${constants.emojis.music.replaying} ${strings.title}`,
					description: strings.description,
					color: constants.colours.blue,
				},
			],
		},
		{ visible: true },
	);

	musicService.replay(interaction.parameters.collection ?? false);
}

export default command;
