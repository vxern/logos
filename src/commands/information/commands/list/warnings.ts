import {
	ApplicationCommandFlags,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import { getOrCreateUser } from 'logos/src/database/functions/users.ts';
import { getWarnings } from 'logos/src/database/functions/warnings.ts';
import { Warning } from 'logos/src/database/structs/users/warning.ts';
import { Document } from 'logos/src/database/structs/document.ts';
import { Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { chunk, paginate, parseArguments, trim } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { displayTime, list } from 'logos/formatting.ts';

async function listWarnings(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		user,
	);
	if (!member) return;

	const displayError = (): void => {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(
							Commands.list.strings.warningsUnableToBeShown,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	};

	const subject = await getOrCreateUser(client, 'id', member.id.toString());
	if (!subject) return displayError();

	const warnings = await getWarnings(client, subject.ref);
	if (!warnings) return displayError();

	const pages = chunk(
		warnings,
		configuration.interactions.responses.resultsPerPage,
	);

	const generateWarningsPage = (
		warnings: Document<Warning>[],
		_index: number,
	): string => {
		if (warnings.length === 0) {
			return localise(
				Commands.list.strings.userDoesNotHaveWarnings,
				interaction.locale,
			);
		}

		return list(
			warnings.map(
				(warning) => `${trim(warning.data.reason, 50)} (${displayTime(warning.ts)})`,
			),
		);
	};

	return paginate([client, bot], interaction, {
		elements: pages,
		embed: { color: configuration.interactions.responses.colors.blue },
		view: {
			title: localise(Commands.list.strings.warnings, interaction.locale),
			generate: generateWarningsPage,
		},
		show: false,
	});
}

export { listWarnings };
