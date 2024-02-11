import constants from "../../../../../constants/constants";
import { Locale } from "../../../../../constants/languages";
import time from "../../../../../constants/time";
import { MentionTypes, mention, timestamp, trim } from "../../../../../formatting";
import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { Guild } from "../../../../database/guild";
import diagnostics from "../../../../diagnostics";
import { parseArguments, parseTimeExpression, reply, respond } from "../../../../interactions";

async function handleSetTimeoutAutocomplete(client: Client, interaction: Logos.Interaction): Promise<void> {
	const language = interaction.language;
	const locale = interaction.locale;

	const [{ user, duration }, focused] = parseArguments(interaction.data?.options, {});

	switch (focused?.name) {
		case "user": {
			if (user === undefined) {
				return;
			}

			client.autocompleteMembers(interaction, {
				identifier: user,
				options: { restrictToNonSelf: true, excludeModerators: true },
			});
			return;
		}
		case "duration": {
			if (duration === undefined) {
				return;
			}

			const timestamp = parseTimeExpression(client, duration, { language, locale });
			if (timestamp === undefined) {
				const strings = {
					autocomplete: client.localise("autocomplete.timestamp", locale)(),
				};

				respond(client, interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
				return;
			}

			respond(client, interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
		}
	}
}

async function handleSetTimeout(client: Client, interaction: Logos.Interaction): Promise<void> {
	const language = interaction.language;
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const session = client.database.openSession();

	const guildDocument =
		client.documents.guilds.get(guildId.toString()) ??
		(await session.get<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.moderation.features?.timeouts;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ user, duration, reason }] = parseArguments(interaction.data?.options, {});
	if (user === undefined || duration === undefined) {
		return;
	}

	const member = client.resolveInteractionToMember(
		interaction,
		{
			identifier: user,
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

	let durationParsed = Number(duration);

	if (!Number.isSafeInteger(durationParsed)) {
		const timestamp = parseTimeExpression(client, duration, { language, locale });
		if (timestamp === undefined) {
			displayDurationInvalidError(client, interaction, { locale });
			return;
		}

		durationParsed = timestamp[1];
	}

	if (durationParsed < time.minute) {
		displayTooShortWarning(client, interaction, { locale });
		return;
	}

	if (durationParsed > time.week) {
		displayTooLongWarning(client, interaction, { locale });
		return;
	}

	if (reason === undefined) {
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

	if (configuration.journaling) {
		const journallingService = client.getJournallingService(guild.id);
		journallingService?.log("memberTimeoutAdd", { args: [member, until, reason, interaction.user] });
	}

	const strings = {
		title: client.localise("timeout.strings.timedOut.title", locale)(),
		description: client.localise(
			"timeout.strings.timedOut.description",
			locale,
		)({
			user_mention: mention(member.id, MentionTypes.User),
			relative_timestamp: timestamp(until),
		}),
	};

	reply(client, interaction, {
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

	reply(client, interaction, {
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

	reply(client, interaction, {
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

	reply(client, interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.yellow }],
	});
}

export { handleSetTimeout, handleSetTimeoutAutocomplete };
