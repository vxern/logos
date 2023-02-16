import {
	ApplicationCommandFlags,
	Bot,
	calculatePermissions,
	Embed,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import { Warning } from 'logos/src/database/structs/mod.ts';
import { Document } from 'logos/src/database/document.ts';
import { autocompleteMembers, Client, resolveInteractionToMember } from 'logos/src/client.ts';
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
	if (recipient === undefined) return displayError(bot, interaction);

	const warnings = await client.database.adapters.warnings.getOrFetch(client, 'recipient', recipient.ref)
		.then((warnings) => warnings !== undefined ? Array.from(warnings.values()) : undefined);
	if (warnings === undefined) return displayError(bot, interaction);

	return void sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [getWarningPage(warnings, isSelf, interaction.locale)],
		},
	});
}

function displayError(bot: Bot, interaction: Interaction): void {
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: localise(Commands.list.strings.unableToDisplayWarnings, interaction.locale),
					color: constants.colors.red,
				}],
			},
		},
	);
}

function getWarningPage(warnings: Document<Warning>[], isSelf: boolean, locale: string | undefined): Embed {
	if (warnings.length === 0) {
		if (isSelf) {
			return {
				description: localise(Commands.list.strings.hasNoActiveWarningsDirect, locale),
				color: constants.colors.blue,
			};
		}

		return { description: localise(Commands.list.strings.hasNoActiveWarnings, locale), color: constants.colors.blue };
	}

	const formatWarningString = localise(Commands.list.strings.warning, locale);

	return {
		title: localise(Commands.list.strings.warnings, locale),
		fields: warnings.map((warning, index) => {
			const warningString = formatWarningString(index + 1, timestamp(warning.data.createdAt));

			return { name: warningString, value: `*${warning.data.reason}*` };
		}),
		color: constants.colors.blue,
	};
}

export { getWarningPage, handleDisplayWarnings, handleDisplayWarningsAutocomplete };
