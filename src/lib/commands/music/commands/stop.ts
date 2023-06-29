import { ApplicationCommandOptionTypes, Bot, Interaction } from "discordeno";
import { OptionTemplate } from "../../command.js";
import { getVoiceState, reset, verifyCanManagePlayback } from "../../../controllers/music.js";
import { Client, localise } from "../../../client.js";
import { reply } from "../../../interactions.js";
import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";

const command: OptionTemplate = {
	name: "stop",
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleStopPlayback,
};

async function handleStopPlayback([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
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

	const botVoiceState = getVoiceState(client, interaction.guildId!, bot.id);
	if (botVoiceState === undefined) {
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

	reset(client, interaction.guildId!);

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
