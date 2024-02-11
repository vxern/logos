import constants from "../../../../../constants/constants";
import defaults from "../../../../../defaults";
import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { parseArguments, reply } from "../../../../interactions";

async function handleSetVolume(client: Client, interaction: Logos.Interaction): Promise<void> {
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

		reply(client, interaction, {
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
			title: client.localise("music.options.volume.options.set.strings.invalid.title", locale)(),
			description: client.localise(
				"music.options.volume.options.set.strings.invalid.description",
				locale,
			)({ volume: defaults.MAX_VOLUME }),
		};

		reply(client, interaction, {
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
		title: client.localise("music.options.volume.options.set.strings.set.title", locale)(),
		description: client.localise("music.options.volume.options.set.strings.set.description", locale)({ volume }),
	};

	reply(
		client,
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
