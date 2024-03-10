import { Locale } from "../../../../constants/languages";
import { trim } from "../../../../formatting";
import { Client } from "../../../client";
import { parseTimeExpression } from "../../../interactions";
import { OptionTemplate } from "../../command";
import { timestamp } from "../../parameters";

const command: OptionTemplate = {
	id: "skip-to",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleSkipToTimestamp,
	handleAutocomplete: handleSkipToTimestampAutocomplete,
	options: [timestamp],
};

async function handleSkipToTimestampAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { timestamp: string }>,
): Promise<void> {
	const locale = interaction.locale;

	const timestamp = parseTimeExpression(client, interaction.parameters.timestamp, { locale });
	if (timestamp === undefined) {
		const strings = {
			autocomplete: client.localise("autocomplete.timestamp", locale)(),
		};

		client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
		return;
	}

	client.respond(interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
}

async function handleSkipToTimestamp(
	client: Client,
	interaction: Logos.Interaction<any, { timestamp: string }>,
): Promise<void> {
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

	const [isOccupied, current] = [musicService.isOccupied, musicService.current];
	if (!isOccupied || current === undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.skip-to.strings.noSong.title", locale)(),
			description: client.localise("music.options.skip-to.strings.noSong.description", locale)(),
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
				},
			],
		});
		return;
	}

	const timestamp = Number(interaction.parameters.timestamp);
	if (!Number.isSafeInteger(timestamp)) {
		displayInvalidTimestampError(client, interaction, { locale });
		return;
	}

	await musicService.skipTo(timestamp);

	const strings = {
		title: client.localise("music.options.skip-to.strings.skippedTo.title", locale)(),
		description: client.localise("music.options.skip-to.strings.skippedTo.description", locale)(),
	};

	client.reply(
		interaction,
		{
			embeds: [
				{
					title: `${constants.emojis.music.skippedTo} ${strings.title}`,
					description: strings.description,
					color: constants.colours.blue,
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
		title: client.localise("music.options.skip-to.strings.invalidTimestamp.title", locale)(),
		description: client.localise("music.options.skip-to.strings.invalidTimestamp.description", locale)(),
	};

	client.reply(interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colours.red }],
	});
}

export default command;
