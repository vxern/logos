import constants from "../../../../constants/constants";
import defaults from "../../../../defaults";
import { Client, localise } from "../../../client";
import { reply } from "../../../interactions";
import { OptionTemplate } from "../../command";
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
	if (!isVoiceStateVerified) {
		return;
	}

	const [isOccupied, isPaused] = [musicService.isOccupied, musicService.isPaused];
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

	if (isPaused === undefined) {
		return;
	}

	if (!isPaused) {
		const strings = {
			title: localise(client, "music.options.resume.strings.notPaused.title", interaction.locale)(),
			description: localise(client, "music.options.resume.strings.notPaused.description", interaction.locale)(),
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
		title: localise(client, "music.options.resume.strings.resumed.title", defaults.LOCALISATION_LOCALE)(),
		description: localise(client, "music.options.resume.strings.resumed.description", defaults.LOCALISATION_LOCALE)(),
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
