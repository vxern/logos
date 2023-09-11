import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { MentionTypes, mention } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, autocompleteMembers, localise, resolveInteractionToMember } from "../../../client";
import { stringifyValue } from "../../../database/database";
import { Document } from "../../../database/document";
import { timeStructToMilliseconds } from "../../../database/structs/guild";
import { Warning } from "../../../database/structs/warning";
import { parseArguments, reply, respond } from "../../../interactions";
import { CommandTemplate } from "../../command";
import { user } from "../../parameters";
import { getActiveWarnings } from "../module";

const command: CommandTemplate = {
	name: "pardon",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["MODERATE_MEMBERS"],
	handle: handlePardonUser,
	handleAutocomplete: handlePardonUserAutocomplete,
	options: [
		user,
		{
			name: "warning",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
	],
};

async function handlePardonUserAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

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

	const configuration = guildDocument.data.features.moderation.features?.warns;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ user, warning }, focused] = parseArguments(interaction.data?.options, {});

	if (focused?.name === "user") {
		if (user === undefined) {
			return;
		}

		autocompleteMembers([client, bot], interaction, user, {
			restrictToNonSelf: true,
			excludeModerators: true,
		});
		return;
	}

	if (focused?.name === "warning") {
		if (user === undefined || warning === undefined) {
			respond([client, bot], interaction, []);
			return;
		}

		const member = resolveInteractionToMember(
			[client, bot],
			interaction,
			user,
			{
				restrictToNonSelf: true,
				excludeModerators: true,
			},
			{ locale },
		);
		if (member === undefined) {
			respond([client, bot], interaction, []);
			return;
		}

		const expiryMilliseconds = timeStructToMilliseconds(configuration.expiration ?? defaults.WARN_EXPIRY);

		const relevantWarnings = await getRelevantWarnings(client, member, expiryMilliseconds);
		if (relevantWarnings === undefined) {
			respond([client, bot], interaction, []);
			return;
		}

		const warningLowercase = warning.toLowerCase();
		const choices = relevantWarnings
			.map<Discord.ApplicationCommandOptionChoice>((warning) => ({
				name: warning.data.reason,
				value: stringifyValue(warning.ref),
			}))
			.filter((choice) => choice.name.toLowerCase().includes(warningLowercase));

		respond([client, bot], interaction, choices);
		return;
	}
}

async function handlePardonUser([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

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

	const configuration = guildDocument.data.features.moderation.features?.warns;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ user, warning }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		user,
		{
			restrictToNonSelf: true,
			excludeModerators: true,
		},
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	const expiryMilliseconds = timeStructToMilliseconds(configuration.expiration ?? defaults.WARN_EXPIRY);

	const relevantWarnings = await getRelevantWarnings(client, member, expiryMilliseconds);
	if (relevantWarnings === undefined) {
		displayFailedError([client, bot], interaction, { locale });
		return;
	}

	const warningToDelete = relevantWarnings.find((relevantWarning) => stringifyValue(relevantWarning.ref) === warning);
	if (warningToDelete === undefined) {
		displayInvalidWarningError([client, bot], interaction, { locale });
		return;
	}

	const deletedWarning = await client.database.adapters.warnings.delete(client, warningToDelete);
	if (deletedWarning === undefined) {
		displayFailedError([client, bot], interaction, { locale });
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	if (configuration.journaling) {
		const journallingService = client.services.journalling.get(guild.id);
		journallingService?.log("memberWarnRemove", { args: [member, deletedWarning.data, interaction.user] });
	}

	const strings = {
		title: localise(client, "pardon.strings.pardoned.title", locale)(),
		description: localise(
			client,
			"pardon.strings.pardoned.description",
			locale,
		)({
			user_mention: mention(member.id, MentionTypes.User),
			reason: deletedWarning.data.reason,
		}),
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.lightGreen,
			},
		],
	});
}

async function getRelevantWarnings(
	client: Client,
	member: Logos.Member,
	expirationMilliseconds: number,
): Promise<Document<Warning>[] | undefined> {
	const subject = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		"id",
		member.id.toString(),
		member.id,
	);
	if (subject === undefined) {
		return undefined;
	}

	const warnings = await client.database.adapters.warnings.getOrFetch(client, "recipient", subject.ref);
	if (warnings === undefined) {
		return undefined;
	}

	const relevantWarnings = Array.from(getActiveWarnings(warnings, expirationMilliseconds).values()).reverse();
	return relevantWarnings;
}

async function displayInvalidWarningError(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: localise(client, "pardon.strings.invalidWarning.title", locale)(),
		description: localise(client, "pardon.strings.invalidWarning.description", locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			},
		],
	});
}

async function displayFailedError(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: localise(client, "pardon.strings.failed.title", locale)(),
		description: localise(client, "pardon.strings.failed.description", locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			},
		],
	});
}

export default command;
