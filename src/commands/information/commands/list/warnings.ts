import {
	ApplicationCommandFlags,
	Bot,
	calculatePermissions,
	Embed,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Warning } from 'logos/src/database/structs/mod.ts';
import { Document } from 'logos/src/database/document.ts';
import { autocompleteMembers, Client, localise, resolveInteractionToMember } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { timestamp } from 'logos/formatting.ts';

async function handleDisplayWarningsAutocomplete(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});

	const isModerator = calculatePermissions(interaction.member!.permissions!).includes('MODERATE_MEMBERS');

	return autocompleteMembers(
		[client, bot],
		interaction,
		user!,
		// Stops normal members from viewing other people's warnings.
		{ restrictToSelf: !isModerator },
	);
}

async function handleDisplayWarnings([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});

	const isModerator = calculatePermissions(interaction.member!.permissions!).includes('MODERATE_MEMBERS');

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		user ?? interaction.user.id.toString(),
		{ restrictToSelf: !isModerator },
	);
	if (member === undefined) return;

	const isSelf = member.id === interaction.user.id;

	const recipient = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		'id',
		member.id.toString(),
		member.id,
	);
	if (recipient === undefined) return displayError([client, bot], interaction);

	const warnings = await client.database.adapters.warnings.getOrFetch(client, 'recipient', recipient.ref)
		.then((warnings) => warnings !== undefined ? Array.from(warnings.values()) : undefined);
	if (warnings === undefined) return displayError([client, bot], interaction);

	return void sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [getWarningPage(client, warnings, isSelf, interaction.locale)],
		},
	});
}

function displayError([client, bot]: [Client, Bot], interaction: Interaction): void {
	const strings = {
		title: localise(client, 'list.options.warnings.strings.failed.title', interaction.locale)(),
		description: localise(client, 'list.options.warnings.strings.failed.description', interaction.locale)(),
	};

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				}],
			},
		},
	);
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
				self: localise(client, 'list.options.warnings.strings.noActiveWarnings.self', locale)(),
			};

			return {
				description: strings.self,
				color: constants.colors.blue,
			};
		} else {
			const strings = {
				other: localise(client, 'list.options.warnings.strings.noActiveWarnings.other', locale)(),
			};

			return {
				description: strings.other,
				color: constants.colors.blue,
			};
		}
	}

	const strings = {
		title: localise(client, 'list.options.warnings.strings.warnings', locale)(),
		warning: localise(client, 'list.options.warnings.strings.warningFormatted', locale),
	};

	return {
		title: strings.title,
		fields: warnings.map((warning, index) => {
			const warningString = strings.warning({
				'index': index + 1,
				'relative_timestamp': timestamp(warning.data.createdAt),
			});

			return { name: warningString, value: `*${warning.data.reason}*` };
		}),
		color: constants.colors.blue,
	};
}

export { getWarningPage, handleDisplayWarnings, handleDisplayWarningsAutocomplete };
