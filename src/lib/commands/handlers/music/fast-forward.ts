import { Locale } from "logos:constants/languages";
import { trim } from "logos:core/formatting";
import { Client } from "logos/client";
import { parseTimeExpression } from "logos/stores/interactions";

async function handleFastForwardAutocomplete(
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

async function handleFastForward(
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

	const [isOccupied, current, position] = [musicService.isOccupied, musicService.current, musicService.position];
	if (!isOccupied || current === undefined) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.options.fast-forward.strings.noSong.title", locale)(),
			description: client.localise("music.options.fast-forward.strings.noSong.description", locale)(),
		};

		await client.reply(interaction, {
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

	if (position === undefined) {
		return;
	}

	const timestamp = Number(interaction.parameters.timestamp);
	if (!Number.isSafeInteger(timestamp)) {
		await displayInvalidTimestampError(client, interaction, { locale });
		return;
	}

	await musicService.skipTo(Math.round((position + timestamp) / 1000) * 1000);

	const strings = {
		title: client.localise("music.options.fast-forward.strings.fastForwarded.title", locale)(),
		description: client.localise("music.options.fast-forward.strings.fastForwarded.description", locale)(),
	};

	await client.reply(
		interaction,
		{
			embeds: [
				{
					title: `${constants.emojis.music.fastForwarded} ${strings.title}`,
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
		title: client.localise("music.options.fast-forward.strings.invalidTimestamp.title", locale)(),
		description: client.localise("music.options.fast-forward.strings.invalidTimestamp.description", locale)(),
	};

	await client.reply(interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colours.red }],
	});
}

export { handleFastForward, handleFastForwardAutocomplete };
