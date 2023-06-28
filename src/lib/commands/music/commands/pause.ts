import { ApplicationCommandOptionTypes, Bot, Interaction } from "discordeno";
import { handleResumePlayback } from "./resume.js";
import { OptionTemplate } from "../../command.js";
import { getVoiceState, isOccupied, isPaused, pause, verifyCanManagePlayback } from "../../../controllers/music.js";
import { Client, localise } from "../../../client.js";
import { reply } from "../../../interactions.js";
import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";

const command: OptionTemplate = {
	name: "pause",
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handlePausePlayback,
};

function handlePausePlayback([client, bot]: [Client, Bot], interaction: Interaction): void {
	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyCanManagePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) return;

	if (!isOccupied(controller.player)) {
		const strings = {
			title: localise(client, "music.options.pause.strings.notPlaying.title", interaction.locale)(),
			description: localise(client, "music.options.pause.strings.notPlaying.description", interaction.locale)(),
		};

		return void reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});
	}

	if (isPaused(controller.player)) {
		return handleResumePlayback([client, bot], interaction);
	}

	pause(controller.player);

	const strings = {
		title: localise(client, "music.options.pause.strings.paused.title", defaultLocale)(),
		description: localise(client, "music.options.pause.strings.paused.description", defaultLocale)(),
	};

	return void reply(
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
