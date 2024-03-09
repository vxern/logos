import { Client } from "../../../client";
import { OptionTemplate } from "../../command";
import { handleResumePlayback } from "./resume";

const command: OptionTemplate = {
	id: "pause",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handlePausePlayback,
};

async function handlePausePlayback(client: Client, interaction: Logos.Interaction): Promise<void> {
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

	const [isOccupied, current, isPaused] = [musicService.isOccupied, musicService.current, musicService.isPaused];
	if (!isOccupied || current === undefined) {
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
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	if (isPaused === undefined) {
		return;
	}

	if (isPaused) {
		handleResumePlayback(client, interaction);
		return;
	}

	musicService.pause();

	const strings = {
		title: client.localise("music.options.pause.strings.paused.title", locale)(),
		description: client.localise("music.options.pause.strings.paused.description", locale)(),
	};

	client.reply(
		interaction,
		{
			embeds: [
				{
					title: `${constants.emojis.music.paused} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);
}

export default command;
