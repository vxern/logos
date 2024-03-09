import { Client } from "../../../client";
import { OptionTemplate } from "../../command";

const command: OptionTemplate = {
	id: "resume",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleResumePlayback,
};

async function handleResumePlayback(client: Client, interaction: Logos.Interaction): Promise<void> {
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

	if (!isPaused) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.resume.strings.notPaused.title", locale)(),
			description: client.localise("music.options.resume.strings.notPaused.description", locale)(),
		};

		client.reply(interaction, {
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
		title: client.localise("music.options.resume.strings.resumed.title", locale)(),
		description: client.localise("music.options.resume.strings.resumed.description", locale)(),
	};

	client.reply(
		interaction,
		{
			embeds: [
				{
					title: `${constants.emojis.music.resumed} ${strings.title}`,
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
