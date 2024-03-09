import { Locale } from "../../../../constants/languages";
import { trim } from "../../../../formatting";
import { Client } from "../../../client";
import { parseTimeExpression } from "../../../interactions";
import { OptionTemplate } from "../../command";
import { timestamp } from "../../parameters";

const command: OptionTemplate = {
	id: "rewind",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleRewind,
	handleAutocomplete: handleRewindAutocomplete,
	options: [timestamp],
};

async function handleRewindAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { timestamp: string }>,
): Promise<void> {
	const language = interaction.language;
	const locale = interaction.locale;

	const timestamp = parseTimeExpression(client, interaction.parameters.timestamp, { language, locale });
	if (timestamp === undefined) {
		const strings = {
			autocomplete: client.localise("autocomplete.timestamp", locale)(),
		};

		client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
		return;
	}

	client.respond(interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
}

async function handleRewind(client: Client, interaction: Logos.Interaction<any, { timestamp: string }>): Promise<void> {
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

	const [isOccupied, current, position] = [musicService.isOccupied, musicService.current, musicService.position];
	if (!isOccupied || current === undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.rewind.strings.noSong.title", locale)(),
			description: client.localise("music.options.rewind.strings.noSong.description", locale)(),
		};

		client.reply(interaction, {
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

	const timestamp = Number(interaction.parameters.timestamp);
	if (!Number.isSafeInteger(timestamp)) {
		displayInvalidTimestampError(client, interaction, { locale });
		return;
	}

	await musicService.skipTo(Math.round((position - timestamp) / 1000) * 1000);

	const strings = {
		title: client.localise("music.options.rewind.strings.rewound.title", locale)(),
		description: client.localise("music.options.rewind.strings.rewound.description", locale)(),
	};

	client.reply(
		interaction,
		{
			embeds: [
				{
					title: `${constants.emojis.music.rewound} ${strings.title}`,
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

	client.reply(interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.red }],
	});
}

export default command;
