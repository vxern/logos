import {
	ApplicationCommandFlags,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import { getOrCreateUser } from 'logos/src/database/adapters/users.ts';
import { Warning } from 'logos/src/database/structs/users/warning.ts';
import { Document } from 'logos/src/database/structs/document.ts';
import { Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { paginate, parseArguments } from 'logos/src/interactions.ts';
import { chunk } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { displayTime, list, trim } from 'logos/formatting.ts';

async function handleDisplayWarnings(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user);
	if (member === undefined) return;

	const subject = await getOrCreateUser(client, 'id', member.id.toString());
	if (subject === undefined) return displayUnableToDisplayWarningsError(bot, interaction);

	const warnings = await client.database.adapters.warnings.get(client, 'reference', subject.ref);
	if (warnings === undefined) return displayUnableToDisplayWarningsError(bot, interaction);

	const pages = chunk(warnings, configuration.resultsPerPage);

	return paginate([client, bot], interaction, {
		elements: pages,
		embed: { color: configuration.messages.colors.blue },
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
					color: configuration.messages.colors.red,
				}],
			},
		},
	);
}

function generateWarningsPage(warnings: Document<Warning>[], locale: string | undefined): string {
	if (warnings.length === 0) {
		return localise(Commands.list.strings.userDoesNotHaveWarnings, locale);
	}

	return list(
		warnings.map((warning) => `${trim(warning.data.reason, 50)} (${displayTime(warning.ts)})`),
	);
}

export { handleDisplayWarnings };
