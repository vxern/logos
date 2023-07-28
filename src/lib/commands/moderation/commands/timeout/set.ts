import constants from "../../../../../constants/constants";
import time from "../../../../../constants/time";
import { MentionTypes, mention, timestamp } from "../../../../../formatting";
import { Client, autocompleteMembers, localise, resolveInteractionToMember } from "../../../../client";
import diagnostics from "../../../../diagnostics";
import { parseArguments, parseTimeExpression, reply, respond } from "../../../../interactions";
import * as Discord from "discordeno";

async function handleSetTimeoutAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ user, duration }, focused] = parseArguments(interaction.data?.options, {});

	switch (focused?.name) {
		case "user": {
			if (user === undefined) {
				return;
			}

			autocompleteMembers([client, bot], interaction, user, { restrictToNonSelf: true, excludeModerators: true });
			return;
		}
		case "duration": {
			if (duration === undefined) {
				return;
			}

			const timestamp = parseTimeExpression(client, duration, interaction.locale);
			if (timestamp === undefined) {
				respond([client, bot], interaction, []);
				return;
			}

			respond([client, bot], interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
		}
	}
}

async function handleSetTimeout([client, bot]: [Client, Discord.Bot], interaction: Discord.Interaction): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetchOrCreate(
		client,
		"id",
		guildId.toString(),
		guildId,
	);
	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.data.features.moderation.features?.timeouts;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ user, duration, reason }] = parseArguments(interaction.data?.options, {});
	if (user === undefined || duration === undefined) {
		return;
	}

	const member = resolveInteractionToMember([client, bot], interaction, user, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
	if (member === undefined) {
		return;
	}

	let durationParsed = Number(duration);

	if (Number.isNaN(durationParsed)) {
		const timestamp = parseTimeExpression(client, duration, interaction.locale);
		if (timestamp === undefined) {
			displayDurationInvalidError([client, bot], interaction);
			return;
		}

		durationParsed = timestamp[1];
	}

	if (durationParsed < time.minute) {
		displayTooShortWarning([client, bot], interaction);
		return;
	}

	if (durationParsed > time.week) {
		displayTooLongWarning([client, bot], interaction);
		return;
	}

	if (reason === undefined) {
		return;
	}

	const until = Date.now() + durationParsed;

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	await Discord.editMember(bot, guildId, member.id, { communicationDisabledUntil: until }).catch(() =>
		client.log.warn(`Failed to time ${diagnostics.display.member(member)} out.`),
	);

	if (configuration.journaling) {
		const journallingService = client.services.journalling.get(guild.id);
		journallingService?.log(bot, "memberTimeoutAdd", { args: [member, until, reason, interaction.user] });
	}

	const strings = {
		title: localise(client, "timeout.strings.timedOut.title", interaction.locale)(),
		description: localise(
			client,
			"timeout.strings.timedOut.description",
			interaction.locale,
		)({
			user_mention: mention(member.id, MentionTypes.User),
			relative_timestamp: timestamp(until),
		}),
	};

	reply([client, bot], interaction, {
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
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const strings = {
		title: localise(client, "timeout.strings.durationInvalid.title", interaction.locale)(),
		description: localise(client, "timeout.strings.durationInvalid.description", interaction.locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.darkRed }],
	});
}

async function displayTooShortWarning(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const strings = {
		title: localise(client, "timeout.strings.tooShort.title", interaction.locale)(),
		description: localise(client, "timeout.strings.tooShort.description", interaction.locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.yellow }],
	});
}

async function displayTooLongWarning(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const strings = {
		title: localise(client, "timeout.strings.tooLong.title", interaction.locale)(),
		description: localise(client, "timeout.strings.tooLong.description", interaction.locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.yellow }],
	});
}

export { handleSetTimeout, handleSetTimeoutAutocomplete };
