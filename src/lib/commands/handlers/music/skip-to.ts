import { Locale } from "logos:constants/languages";
import { trim } from "logos:core/formatting";
import { Client } from "logos/client";
import { parseTimeExpression } from "logos/commands/interactions";

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

		await client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
		return;
	}

	await client.respond(interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
}

async function handleSkipToTimestamp(
	client: Client,
	interaction: Logos.Interaction<any, { timestamp: string }>,
): Promise<void> {
	const locale = interaction.guildLocale;

	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canManagePlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.skip-to.strings.noSong.title", locale)(),
			description: client.localise("music.options.skip-to.strings.noSong.description", locale)(),
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const timestamp = Number(interaction.parameters.timestamp);
	if (!Number.isSafeInteger(timestamp)) {
		await displayInvalidTimestampError(client, interaction, { locale });
		return;
	}

	await musicService.session.skipTo({ timestamp });

	const strings = {
		title: client.localise("music.options.skip-to.strings.skippedTo.title", locale)(),
		description: client.localise("music.options.skip-to.strings.skippedTo.description", locale)(),
	};

	await client.success(
		interaction,
		{
			title: `${constants.emojis.music.skippedTo} ${strings.title}`,
			description: strings.description,
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

	await client.error(interaction, {
		title: strings.title,
		description: strings.description,
	});
}

export { handleSkipToTimestamp, handleSkipToTimestampAutocomplete };
