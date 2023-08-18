import constants from "../../../../../constants/constants";
import { Locale } from "../../../../../constants/languages";
import { timestamp } from "../../../../../formatting";
import * as Logos from "../../../../../types";
import { Client, autocompleteMembers, localise, resolveInteractionToMember } from "../../../../client";
import { Document } from "../../../../database/document";
import { Warning } from "../../../../database/structs/warning";
import { parseArguments, reply } from "../../../../interactions";
import * as Discord from "@discordeno/bot";

async function handleDisplayWarningsAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	const permissions = interaction.member?.permissions;
	if (permissions === undefined) {
		return;
	}

	const isModerator = permissions.has("MODERATE_MEMBERS");

	autocompleteMembers(
		[client, bot],
		interaction,
		user,
		// Stops normal members from viewing other people's warnings.
		{ restrictToSelf: !isModerator },
	);
}

async function handleDisplayWarnings(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const [{ user }] = parseArguments(interaction.data?.options, {});

	const permissions = interaction.member?.permissions;
	if (permissions === undefined) {
		return;
	}

	const isModerator = permissions.has("MODERATE_MEMBERS");

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		user ?? interaction.user.id.toString(),
		{
			restrictToSelf: !isModerator,
		},
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	const isSelf = member.id === interaction.user.id;

	const recipient = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		"id",
		member.id.toString(),
		member.id,
	);
	if (recipient === undefined) {
		displayError([client, bot], interaction, { locale });
		return;
	}

	const warnings = await client.database.adapters.warnings
		.getOrFetch(client, "recipient", recipient.ref)
		.then((warnings) => (warnings !== undefined ? Array.from(warnings.values()) : undefined));
	if (warnings === undefined) {
		displayError([client, bot], interaction, { locale });
		return;
	}

	reply([client, bot], interaction, {
		embeds: [getWarningPage(client, warnings, isSelf, { locale })],
	});
}

async function displayError(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: localise(client, "list.options.warnings.strings.failed.title", locale)(),
		description: localise(client, "list.options.warnings.strings.failed.description", locale)(),
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

function getWarningPage(
	client: Client,
	warnings: Document<Warning>[],
	isSelf: boolean,
	{ locale }: { locale: Locale },
): Discord.CamelizedDiscordEmbed {
	if (warnings.length === 0) {
		if (isSelf) {
			const strings = {
				title: localise(client, "list.options.warnings.strings.noActiveWarnings.title", locale)(),
				description: localise(client, "list.options.warnings.strings.noActiveWarnings.description.self", locale)(),
			};

			return {
				title: strings.title,
				description: strings.description,
				color: constants.colors.blue,
			};
		} else {
			const strings = {
				title: localise(client, "list.options.warnings.strings.noActiveWarnings.title", locale)(),
				description: localise(client, "list.options.warnings.strings.noActiveWarnings.description.other", locale)(),
			};

			return {
				title: strings.title,
				description: strings.description,
				color: constants.colors.blue,
			};
		}
	}

	const strings = {
		title: localise(client, "list.options.warnings.strings.warnings.title", locale)(),
		warning: localise(client, "list.options.warnings.strings.warnings.description.warning", locale),
	};

	return {
		title: strings.title,
		fields: warnings.map((warning, index) => {
			const warningString = strings.warning({
				index: index + 1,
				relative_timestamp: timestamp(warning.data.createdAt),
			});

			return { name: `${constants.symbols.warn} ${warningString}`, value: `*${warning.data.reason}*` };
		}),
		color: constants.colors.blue,
	};
}

export { getWarningPage, handleDisplayWarnings, handleDisplayWarningsAutocomplete };
