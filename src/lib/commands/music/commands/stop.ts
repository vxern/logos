import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { reply } from "../../../interactions.js";
import { OptionTemplate } from "../../command.js";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "stop",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleStopPlayback,
};

async function handleStopPlayback(
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

	const isOccupied = musicService.isOccupied;
	if (isOccupied === undefined) {
		return;
	}

	if (!isOccupied) {
		const strings = {
			title: localise(client, "music.options.stop.strings.notPlaying.title", interaction.locale)(),
			description: localise(client, "music.options.stop.strings.notPlaying.description", interaction.locale)(),
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

	musicService.destroySession();

	const strings = {
		title: localise(client, "music.options.stop.strings.stopped.title", defaultLocale)(),
		description: localise(client, "music.options.stop.strings.stopped.description", defaultLocale)(),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.stopped} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);
}

export default command;
