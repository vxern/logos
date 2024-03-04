import { Locale } from "../../../../../constants/languages";
import diagnostics from "../../../../../diagnostics";
import { mention, timestamp, trim } from "../../../../../formatting";
import { Client } from "../../../../client";
import { Guild } from "../../../../database/guild";
import { parseTimeExpression } from "../../../../interactions";

async function handleSetTimeoutAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; duration: string }>,
): Promise<void> {
	const language = interaction.language;
	const locale = interaction.locale;

	if (interaction.parameters.focused === undefined) {
		return;
	}

	switch (interaction.parameters.focused) {
		case "user": {
			client.autocompleteMembers(interaction, {
				identifier: interaction.parameters.focused,
				options: { restrictToNonSelf: true, excludeModerators: true },
			});
			return;
		}
		case "duration": {
			const timestamp = parseTimeExpression(client, interaction.parameters.duration, { language, locale });
			if (timestamp === undefined) {
				const strings = {
					autocomplete: client.localise("autocomplete.timestamp", locale)(),
				};

				client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
				return;
			}

			client.respond(interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
		}
	}
}

async function handleSetTimeout(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; duration: string; reason: string }>,
): Promise<void> {
	const language = interaction.language;
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.timeouts;
	if (configuration === undefined) {
		return;
	}

	const member = client.resolveInteractionToMember(
		interaction,
		{
			identifier: interaction.parameters.user,
			options: {
				restrictToNonSelf: true,
				excludeModerators: true,
			},
		},
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	let durationParsed = Number(interaction.parameters.duration);
	if (!Number.isSafeInteger(durationParsed)) {
		const timestamp = parseTimeExpression(client, interaction.parameters.duration, { language, locale });
		if (timestamp === undefined) {
			displayDurationInvalidError(client, interaction, { locale });
			return;
		}

		durationParsed = timestamp[1];
	}

	if (durationParsed < constants.time.minute) {
		displayTooShortWarning(client, interaction, { locale });
		return;
	}

	if (durationParsed > constants.time.week) {
		displayTooLongWarning(client, interaction, { locale });
		return;
	}

	const until = Date.now() + durationParsed;

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	await client.bot.rest
		.editMember(guildId, member.id, { communicationDisabledUntil: new Date(until).toISOString() })
		.catch((reason) => client.log.warn(`Failed to time ${diagnostics.display.member(member)} out:`, reason));

	client.tryLog("memberTimeoutAdd", {
		guildId: guild.id,
		args: [member, until, interaction.parameters.reason, interaction.user],
	});

	const strings = {
		title: client.localise("timeout.strings.timedOut.title", locale)(),
		description: client.localise(
			"timeout.strings.timedOut.description",
			locale,
		)({
			user_mention: mention(member.id, { type: "user" }),
			relative_timestamp: timestamp(until, { format: "relative" }),
		}),
	};

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.blue,
			},
		],
	});
}

async function displayDurationInvalidError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("timeout.strings.durationInvalid.title", locale)(),
		description: client.localise("timeout.strings.durationInvalid.description", locale)(),
	};

	client.reply(interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.darkRed }],
	});
}

async function displayTooShortWarning(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("timeout.strings.tooShort.title", locale)(),
		description: client.localise("timeout.strings.tooShort.description", locale)(),
	};

	client.reply(interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.yellow }],
	});
}

async function displayTooLongWarning(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("timeout.strings.tooLong.title", locale)(),
		description: client.localise("timeout.strings.tooLong.description", locale)(),
	};

	client.reply(interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.yellow }],
	});
}

export { handleSetTimeout, handleSetTimeoutAutocomplete };
