import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { reply } from "../../../interactions.js";
import { OptionTemplate } from "../../command.js";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "resume",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleResumePlayback,
};

async function handleResumePlayback(
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
			title: localise(client, "music.options.resume.strings.noSong.title", interaction.locale)(),
			description: localise(client, "music.options.resume.strings.noSong.description", interaction.locale)(),
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

	if (!isPaused) {
		const strings = {
			title: localise(client, "music.options.resume.strings.notPaused", interaction.locale)(),
			description: localise(client, "music.options.resume.strings.notPaused", interaction.locale)(),
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

	musicService.resume();

	const strings = {
		title: localise(client, "music.options.resume.strings.resumed.title", defaultLocale)(),
		description: localise(client, "music.options.resume.strings.resumed.description", defaultLocale)(),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.resumed} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);
}

export default command;
export { handleResumePlayback };
