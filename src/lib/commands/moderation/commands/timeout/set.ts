import { Bot, editMember, Interaction } from "discordeno";
import { logEvent } from "../../../../controllers/logging/logging.js";
import { autocompleteMembers, Client, localise, resolveInteractionToMember } from "../../../../client.js";
import { parseArguments, parseTimeExpression, reply, respond } from "../../../../interactions.js";
import constants, { Periods } from "../../../../../constants.js";
import { mention, MentionTypes, timestamp } from "../../../../../formatting.js";

async function handleSetTimeoutAutocomplete([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user, duration }, focused] = parseArguments(interaction.data?.options, {});

	switch (focused!.name) {
		case "user": {
			autocompleteMembers([client, bot], interaction, user!, { restrictToNonSelf: true, excludeModerators: true });
			return;
		}
		case "duration": {
			const timestamp = parseTimeExpression(client, duration!, interaction.locale);
			if (timestamp === undefined) {
				respond([client, bot], interaction, []);
				return;
			}

			respond([client, bot], interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
		}
	}
}

async function handleSetTimeout([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user, duration, reason }] = parseArguments(interaction.data?.options, {});
	if (user === undefined || duration === undefined) {
		return;
	}

	const member = resolveInteractionToMember([client, bot], interaction, user!, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
	if (member === undefined) {
		return;
	}

	const durationParsed = Number(duration);

	if (Number.isNaN(duration)) {
		displayDurationInvalidError([client, bot], interaction);
		return;
	}

	if (durationParsed < Periods.minute) {
		displayTooShortWarning([client, bot], interaction);
		return;
	}

	if (durationParsed > Periods.week) {
		displayTooLongWarning([client, bot], interaction);
		return;
	}

	const until = Date.now() + durationParsed;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) {
		return;
	}

	await editMember(bot, interaction.guildId!, member.id, { communicationDisabledUntil: until }).catch(() =>
		client.log.warn(`Failed to time member with ID ${member.id} out.`),
	);

	logEvent([client, bot], guild, "memberTimeoutAdd", [member, until, reason!, interaction.user]);

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

async function displayDurationInvalidError([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const strings = {
		title: localise(client, "timeout.strings.durationInvalid.title", interaction.locale)(),
		description: localise(client, "timeout.strings.durationInvalid.description", interaction.locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.darkRed }],
	});
}

async function displayTooShortWarning([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const strings = {
		title: localise(client, "timeout.strings.tooShort.title", interaction.locale)(),
		description: localise(client, "timeout.strings.tooShort.description", interaction.locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.yellow }],
	});
}

async function displayTooLongWarning([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const strings = {
		title: localise(client, "timeout.strings.tooLong.title", interaction.locale)(),
		description: localise(client, "timeout.strings.tooLong.description", interaction.locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.yellow }],
	});
}

export { handleSetTimeout, handleSetTimeoutAutocomplete };
