import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { reply } from "../../../interactions.js";
import { OptionTemplate } from "../../command.js";
import { handleResumePlayback } from "./resume.js";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "pause",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handlePausePlayback,
};

async function handlePausePlayback(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
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

	const [isOccupied, isPaused] = [musicService.isOccupied, musicService.isPaused];
	if (isOccupied === undefined || isPaused === undefined) {
		return;
	}

	if (!isOccupied) {
		const strings = {
			title: localise(client, "music.options.pause.strings.notPlaying.title", interaction.locale)(),
			description: localise(client, "music.options.pause.strings.notPlaying.description", interaction.locale)(),
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

	if (isPaused) {
		handleResumePlayback([client, bot], interaction);
		return;
	}

	musicService.pause();

	const strings = {
		title: localise(client, "music.options.pause.strings.paused.title", defaultLocale)(),
		description: localise(client, "music.options.pause.strings.paused.description", defaultLocale)(),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.paused} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);
}

export default command;
