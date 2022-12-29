import {
	ApplicationCommandFlags,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import { Warning } from 'logos/src/database/structs/mod.ts';
import { Document } from 'logos/src/database/document.ts';
import { Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { paginate, parseArguments } from 'logos/src/interactions.ts';
import { chunk } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { list, timestamp, trim } from 'logos/formatting.ts';

async function handleDisplayWarnings(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user);
	if (member === undefined) return;

	const recipient = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		'id',
		member.id.toString(),
		member.id,
	);
	if (recipient === undefined) return displayUnableToDisplayWarningsError(bot, interaction);

	const warnings = await client.database.adapters.warnings.getOrFetch(client, 'recipient', recipient.ref);
	if (warnings === undefined) return displayUnableToDisplayWarningsError(bot, interaction);

	const pages = chunk(Array.from(warnings.values()), configuration.resultsPerPage);

	return paginate([client, bot], interaction, {
		elements: pages,
		embed: { color: constants.colors.blue },
		view: {
			title: localise(Commands.list.strings.warnings, interaction.locale),
			generate: (warnings, _index) => generateWarningsPage(warnings, interaction.locale),
		},
		show: false,
	});
}

function displayUnableToDisplayWarningsError(bot: Bot, interaction: Interaction): void {
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

function generateWarningsPage(warnings: Document<Warning>[], locale: string | undefined): string {
	if (warnings.length === 0) {
		return `*${localise(Commands.list.strings.userDoesNotHaveWarnings, locale)}*`;
	}

	return list(
		warnings.map((warning) => `${trim(warning.data.reason, 50)} (${timestamp(warning.data.createdAt)})`),
	);
}

export { generateWarningsPage, handleDisplayWarnings };
