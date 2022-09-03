import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	dayjs,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client, resolveInteractionToMember } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { Document } from '../../../database/structs/document.ts';
import { Warning } from '../../../database/structs/users/warning.ts';
import { list } from '../../../formatting.ts';
import { chunk, paginate, trim } from '../../../utils.ts';
import { user } from '../../parameters.ts';

const command: CommandBuilder = {
	name: 'list',
	nameLocalizations: {
		pl: 'spisz',
		ro: 'enumerare',
	},
	description: 'Allows the viewing of various information about users.',
	descriptionLocalizations: {
		pl: 'Pozwala na wyświetlanie różnych informacji o użytkownikach.',
		ro: 'Permite afișarea diverselor informații despre utilizatori.',
	},
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	options: [{
		name: 'warnings',
		nameLocalizations: {
			pl: 'ostrzeżenia',
			ro: 'avertismente',
		},
		description: 'Lists the warnings issued to a user.',
		descriptionLocalizations: {
			pl: 'Wyświetla ostrzeżenia dane użytkownikowi.',
			ro: 'Afișează avertismentele date unui utilizator.',
		},
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: listWarnings,
		options: [user],
	}],
};

async function listWarnings(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const userIdentifier = <string | undefined> interaction.data?.options?.at(0)
		?.options?.at(
			0,
		)?.value;
	if (userIdentifier === undefined) return;

	const member = resolveInteractionToMember(
		client,
		interaction,
		userIdentifier,
	);
	if (!member) return;

	const displayError = (): void => {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: 'The warnings for the given user could not be shown.',
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	};

	const subject = await client.database.getOrCreateUser(
		'id',
		member.id.toString(),
	);
	if (!subject) return displayError();

	const warnings = await client.database.getWarnings(subject.ref);
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
			return 'This user has not received any warnings.';
		}

		return list(
			warnings.map(
				(warning) =>
					`${trim(warning.data.reason, 50)} (${dayjs(warning.ts).fromNow()})`,
			),
		);
	};

	return paginate(client, interaction, {
		elements: pages,
		embed: { color: configuration.interactions.responses.colors.blue },
		view: { title: 'Warnings', generate: generateWarningsPage },
		show: false,
	});
}

export default command;
