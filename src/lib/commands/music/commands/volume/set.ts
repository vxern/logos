import constants from "../../../../../constants/constants";
import defaults from "../../../../../defaults";
import * as Logos from "../../../../../types";
import { Client, localise } from "../../../../client";
import { parseArguments, reply } from "../../../../interactions";
import * as Discord from "discordeno";

async function handleSetVolume([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.guildLocale;

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

	const isOccupied = musicService.isOccupied;
	if (!isOccupied) {
		const locale = interaction.locale;
		const strings = {
			title: localise(client, "music.strings.notPlaying.title", locale)(),
			description: {
				toManage: localise(client, "music.strings.notPlaying.description.toManage", locale)(),
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

	const [{ volume }] = parseArguments(interaction.data?.options, { volume: "number" });
	if (volume === undefined || !Number.isSafeInteger(volume)) {
		return;
	}

	if (volume < 0 || volume > defaults.MAX_VOLUME) {
		const locale = interaction.locale;
		const strings = {
			title: localise(client, "music.options.volume.options.set.strings.invalid.title", locale)(),
			description: localise(
				client,
				"music.options.volume.options.set.strings.invalid.description",
				locale,
			)({ volume: defaults.MAX_VOLUME }),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});
		return;
	}

	musicService.setVolume(volume);

	const strings = {
		title: localise(client, "music.options.volume.options.set.strings.set.title", locale)(),
		description: localise(client, "music.options.volume.options.set.strings.set.description", locale)({ volume }),
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
		{ visible: true },
	);
}

export { handleSetVolume };
