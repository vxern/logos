import { trim } from "logos:core/formatting";
import type { Client } from "logos/client";
import { parseTimeExpression } from "logos/commands/interactions";

async function handleRewindAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { timestamp: string }>,
): Promise<void> {
	const timestamp = parseTimeExpression(client, interaction, interaction.parameters.timestamp);
	if (timestamp === undefined) {
		const strings = constants.contexts.autocompleteTimestamp({
			localise: client.localise,
			locale: interaction.locale,
		});

		await client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
		return;
	}

	await client.respond(interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
}

async function handleRewind(client: Client, interaction: Logos.Interaction<any, { timestamp: string }>): Promise<void> {
	const musicService = client.getMusicService(interaction.guildId);
	if (musicService === undefined) {
		return;
	}

	if (!musicService.canManagePlayback(interaction)) {
		return;
	}

	if (!musicService.hasSession) {
		const strings = constants.contexts.noSongToRewind({
			localise: client.localise,
			locale: interaction.locale,
		});
		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});
		return;
	}

	const timestamp = Number(interaction.parameters.timestamp);
	if (!Number.isSafeInteger(timestamp)) {
		await displayInvalidTimestampError(client, interaction);
		return;
	}

	await musicService.session.skipTo({ timestamp: musicService.session.playingTimeMilliseconds - timestamp });

	const strings = constants.contexts.rewound({ localise: client.localise, locale: interaction.guildLocale });
	await client.success(
		interaction,
		{
			title: `${constants.emojis.music.rewound} ${strings.title}`,
			description: strings.description,
		},
		{ visible: true },
	);
}

async function displayInvalidTimestampError(client: Client, interaction: Logos.Interaction): Promise<void> {
	const strings = constants.contexts.invalidRewindTimestamp({
		localise: client.localise,
		locale: interaction.locale,
	});
	await client.error(interaction, {
		title: strings.title,
		description: strings.description,
	});
}

export { handleRewind, handleRewindAutocomplete };
