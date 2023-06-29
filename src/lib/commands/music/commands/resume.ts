import { ApplicationCommandOptionTypes, Bot, Interaction } from "discordeno";
import { OptionTemplate } from "../../command.js";
import { getVoiceState, isOccupied, isPaused, resume, verifyCanManagePlayback } from "../../../controllers/music.js";
import { Client, localise } from "../../../client.js";
import { reply } from "../../../interactions.js";
import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";

const command: OptionTemplate = {
	name: "resume",
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleResumePlayback,
};

async function handleResumePlayback([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) {
		return;
	}

	const isVoiceStateVerified = verifyCanManagePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) {
		return;
	}

	if (!isOccupied(controller.player)) {
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

	if (!isPaused(controller.player)) {
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

	resume(controller.player);

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
