import constants from "../../../../../constants/constants";
import { defaultLocale } from "../../../../../constants/language";
import { Client, localise } from "../../../../client";
import { parseArguments, reply } from "../../../../interactions";
import * as Discord from "discordeno";

async function handleDisplayVolume(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ show }] = parseArguments(interaction.data?.options, { show: "boolean" });

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

	const volume = musicService.volume;

	const locale = show ? defaultLocale : interaction.locale;

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
