import { Bot, calculatePermissions, Embed, Interaction } from "discordeno";
import { Warning } from "../../../../database/structs/warning.js";
import { Document } from "../../../../database/document.js";
import { autocompleteMembers, Client, localise, resolveInteractionToMember } from "../../../../client.js";
import { parseArguments, reply } from "../../../../interactions.js";
import constants from "../../../../../constants.js";
import { timestamp } from "../../../../../formatting.js";

async function handleDisplayWarningsAutocomplete(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});

	const isModerator = calculatePermissions(interaction.member!.permissions!).includes("MODERATE_MEMBERS");

	autocompleteMembers(
		[client, bot],
		interaction,
		user!,
		// Stops normal members from viewing other people's warnings.
		{ restrictToSelf: !isModerator },
	);
}

async function handleDisplayWarnings([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});

	const isModerator = calculatePermissions(interaction.member!.permissions!).includes("MODERATE_MEMBERS");

	const member = resolveInteractionToMember([client, bot], interaction, user ?? interaction.user.id.toString(), {
		restrictToSelf: !isModerator,
	});
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
		displayError([client, bot], interaction);
		return;
	}

	const warnings = await client.database.adapters.warnings
		.getOrFetch(client, "recipient", recipient.ref)
		.then((warnings) => (warnings !== undefined ? Array.from(warnings.values()) : undefined));
	if (warnings === undefined) {
		displayError([client, bot], interaction);
		return;
	}

	reply([client, bot], interaction, {
		embeds: [getWarningPage(client, warnings, isSelf, interaction.locale)],
	});
}

async function displayError([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const strings = {
		title: localise(client, "list.options.warnings.strings.failed.title", interaction.locale)(),
		description: localise(client, "list.options.warnings.strings.failed.description", interaction.locale)(),
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
	locale: string | undefined,
): Embed {
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

			return { name: warningString, value: `*${warning.data.reason}*` };
		}),
		color: constants.colors.blue,
	};
}

export { getWarningPage, handleDisplayWarnings, handleDisplayWarningsAutocomplete };
