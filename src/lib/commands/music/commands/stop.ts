import { Client } from "../../../client";
import { OptionTemplate } from "../../command";

const command: OptionTemplate = {
	id: "stop",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleStopPlayback,
};

async function handleStopPlayback(client: Client, interaction: Logos.Interaction): Promise<void> {
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

	const isOccupied = musicService.isOccupied;
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

	musicService.stop();

	const strings = {
		title: client.localise("music.options.stop.strings.stopped.title", locale)(),
		description: client.localise("music.options.stop.strings.stopped.description", locale)(),
	};

	client.reply(
		interaction,
		{
			embeds: [
				{
					title: `${constants.emojis.music.stopped} ${strings.title}`,
					description: strings.description,
					color: constants.colours.blue,
				},
			],
		},
		{ visible: true },
	);
}

export default command;
