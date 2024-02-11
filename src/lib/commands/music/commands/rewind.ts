import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import { trim } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { parseArguments, parseTimeExpression, reply, respond } from "../../../interactions";
import { OptionTemplate } from "../../command";
import { timestamp } from "../../parameters";

const command: OptionTemplate = {
	id: "rewind",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleRewind,
	handleAutocomplete: handleRewindAutocomplete,
	options: [timestamp],
};

async function handleRewindAutocomplete(client: Client, interaction: Logos.Interaction): Promise<void> {
	const language = interaction.language;
	const locale = interaction.locale;

	const [{ timestamp: timestampExpression }] = parseArguments(interaction.data?.options, {});
	if (timestampExpression === undefined) {
		return;
	}

	const timestamp = parseTimeExpression(client, timestampExpression, { language, locale });
	if (timestamp === undefined) {
		const strings = {
			autocomplete: client.localise("autocomplete.timestamp", locale)(),
		};

		respond(client, interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
		return;
	}

	respond(client, interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
}

async function handleRewind(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.guildLocale;

	const [{ timestamp: timestampExpression }] = parseArguments(interaction.data?.options, {});

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

	const [isOccupied, current, position] = [musicService.isOccupied, musicService.current, musicService.position];
	if (!isOccupied || current === undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.rewind.strings.noSong.title", locale)(),
			description: client.localise("music.options.rewind.strings.noSong.description", locale)(),
		};

		reply(client, interaction, {
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

	if (position === undefined) {
		return;
	}

	const timestamp = Number(timestampExpression);
	if (!Number.isSafeInteger(timestamp)) {
		displayInvalidTimestampError(client, interaction, { locale });
		return;
	}

	await musicService.skipTo(Math.round((position - timestamp) / 1000) * 1000);

	const strings = {
		title: client.localise("music.options.rewind.strings.rewound.title", locale)(),
		description: client.localise("music.options.rewind.strings.rewound.description", locale)(),
	};

	reply(
		client,
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.rewound} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);
}

async function displayInvalidTimestampError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("music.options.rewind.strings.invalidTimestamp.title", locale)(),
		description: client.localise("music.options.rewind.strings.invalidTimestamp.description", locale)(),
	};

	reply(client, interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.red }],
	});
}

export default command;
