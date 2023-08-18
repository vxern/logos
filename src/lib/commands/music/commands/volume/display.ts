import constants from "../../../../../constants/constants";
import * as Logos from "../../../../../types";
import { Client, localise } from "../../../../client";
import { parseArguments, reply } from "../../../../interactions";
import * as Discord from "@discordeno/bot";

async function handleDisplayVolume(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ show }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const locale = show ? interaction.guildLocale : interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.services.music.music.get(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyVoiceState(interaction, "check");
	if (!isVoiceStateVerified) {
		return;
	}

	const isOccupied = musicService.isOccupied;
	if (!isOccupied) {
		const locale = interaction.locale;
		const strings = {
			title: localise(client, "music.strings.notPlaying.title", locale)(),
			description: {
				toCheck: localise(client, "music.strings.notPlaying.description.toCheck", locale)(),
			},
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description.toCheck,
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	const volume = musicService.volume;

	const strings = {
		title: localise(client, "music.options.volume.options.display.strings.volume.title", locale)(),
		description: localise(
			client,
			"music.options.volume.options.display.strings.volume.description",
			locale,
		)({ volume }),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.volume} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: show },
	);
}

export { handleDisplayVolume };
