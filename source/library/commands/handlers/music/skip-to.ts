import { trim } from "logos:constants/formatting";
import type { Client } from "logos/client";
import { parseTimeExpression } from "logos/commands/interactions";

async function handleSkipToTimestampAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { timestamp: string }>,
): Promise<void> {
	const timestamp = parseTimeExpression(client, interaction, interaction.parameters.timestamp);
	if (timestamp === undefined) {
		const strings = constants.contexts.autocompleteTimestamp({
			localise: client.localise,
			locale: interaction.locale,
		});
		client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]).ignore();

		return;
	}

	client.respond(interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]).ignore();
}

async function handleSkipToTimestamp(
	client: Client,
	interaction: Logos.Interaction<any, { timestamp: string }>,
): Promise<void> {
	const musicService = client.services.local("music", { guildId: interaction.guildId });
	if (!musicService.canManagePlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const strings = constants.contexts.noSongToSkipToTimestampInside({
			localise: client.localise,
			locale: interaction.locale,
		});
		client.warning(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	const timestamp = Number(interaction.parameters.timestamp);
	if (!Number.isSafeInteger(timestamp)) {
		const strings = constants.contexts.invalidSkipToTimestamp({
			localise: client.localise,
			locale: interaction.locale,
		});
		client.error(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	await musicService.session.skipTo({ timestamp });

	const strings = constants.contexts.skippedTo({
		localise: client.localise,
		locale: interaction.guildLocale,
	});
	client
		.success(
			interaction,
			{
				title: `${constants.emojis.music.skippedTo} ${strings.title}`,
				description: strings.description,
			},
			{ visible: true },
		)
		.ignore();
}

export { handleSkipToTimestamp, handleSkipToTimestampAutocomplete };
