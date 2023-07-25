import constants from "../../../../constants/constants";
import { defaultLocale } from "../../../../types";
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
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ timestamp: timestampExpression }] = parseArguments(interaction.data?.options, {});
	if (timestampExpression === undefined) {
		return;
	}

	const timestamp = parseTimeExpression(client, timestampExpression, interaction.locale);
	if (timestamp === undefined) {
		respond([client, bot], interaction, []);
		return;
	}

	respond([client, bot], interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
}

async function handleSkipToTimestamp(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
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
	if (isVoiceStateVerified === undefined || !isVoiceStateVerified) {
		return;
	}

	const [isOccupied, playingSince] = [musicService.isOccupied, musicService.playingSince];
	if (isOccupied === undefined || playingSince === undefined) {
		return;
	}

	if (!isOccupied) {
		const strings = {
			title: localise(client, "music.options.skip-to.strings.noSong.title", interaction.locale)(),
			description: localise(client, "music.options.skip-to.strings.noSong.description", interaction.locale)(),
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

	if (Number.isNaN(timestampExpression)) {
		displayInvalidTimestampError([client, bot], interaction);
		return;
	}

	const timestamp = Number(timestampExpression);

	if (timestamp < 0) {
		musicService.skipTo(0);
	} else if (timestamp > playingSince) {
		musicService.skipTo(playingSince);
	} else {
		musicService.skipTo(timestamp);
	}

	const strings = {
		title: localise(client, "music.options.skip-to.strings.skippedTo.title", defaultLocale)(),
		description: localise(client, "music.options.skip-to.strings.skippedTo.description", defaultLocale)(),
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
	interaction: Discord.Interaction,
): Promise<void> {
	const strings = {
		title: localise(client, "music.options.skip-to.strings.invalidTimestamp.title", interaction.locale)(),
		description: localise(client, "music.options.skip-to.strings.invalidTimestamp.description", interaction.locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.red }],
	});
}

export default command;
