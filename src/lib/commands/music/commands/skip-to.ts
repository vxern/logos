import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { parseArguments, parseTimeExpression, reply, respond } from "../../../interactions";
import { OptionTemplate } from "../../command";
import { timestamp } from "../../parameters";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "skip-to",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleSkipToTimestamp,
	handleAutocomplete: handleSkipToTimestampAutocomplete,
	options: [timestamp],
};

async function handleSkipToTimestampAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const language = interaction.language;
	const locale = interaction.locale;

	const [{ timestamp: timestampExpression }] = parseArguments(interaction.data?.options, {});
	if (timestampExpression === undefined) {
		return;
	}

	const timestamp = parseTimeExpression(client, timestampExpression, { language, locale });
	if (timestamp === undefined) {
		respond([client, bot], interaction, []);
		return;
	}

	respond([client, bot], interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
}

async function handleSkipToTimestamp(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.guildLocale;

	const [{ timestamp: timestampExpression }] = parseArguments(interaction.data?.options, {});

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

	const [isOccupied, playingSince] = [musicService.isOccupied, musicService.playingSince];
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

	if (playingSince === undefined) {
		return;
	}

	const timestamp = Number(timestampExpression);
	if (!Number.isSafeInteger(timestamp)) {
		displayInvalidTimestampError([client, bot], interaction, { locale });
		return;
	}

	if (timestamp < 0) {
		musicService.skipTo(0);
	} else if (timestamp > playingSince) {
		musicService.skipTo(playingSince);
	} else {
		musicService.skipTo(timestamp);
	}

	const strings = {
		title: localise(client, "music.options.skip-to.strings.skippedTo.title", locale)(),
		description: localise(client, "music.options.skip-to.strings.skippedTo.description", locale)(),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.skippedTo} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);
}

async function displayInvalidTimestampError(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: localise(client, "music.options.skip-to.strings.invalidTimestamp.title", locale)(),
		description: localise(client, "music.options.skip-to.strings.invalidTimestamp.description", locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.red }],
	});
}

export default command;
