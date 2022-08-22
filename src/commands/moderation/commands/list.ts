import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	dayjs,
	fetchMembers,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { list } from '../../../formatting.ts';
import {
	chunk,
	mentionUser,
	paginate,
	resolveUserIdentifier,
	trim,
} from '../../../utils.ts';
import { user } from '../../parameters.ts';

const command: CommandBuilder = {
	name: 'list',
	nameLocalizations: {
		pl: 'spisz',
		ro: 'enumerează',
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
	const data = interaction.data;
	if (!data) return;

	const userIdentifier = <string | undefined> data.options?.at(0)?.options?.at(
		0,
	)?.value;
	if (!userIdentifier) return;

	await fetchMembers(client.bot, interaction.guildId!, { limit: 0, query: '' });

	const members = Array.from(client.members.values()).filter((member) =>
		member.guildId === interaction.guildId!
	);

	const matchingUsers = resolveUserIdentifier(
		client,
		interaction.guildId!,
		members,
		userIdentifier,
	);
	if (!matchingUsers) return;

	if (
		interaction.type === InteractionTypes.ApplicationCommandAutocomplete
	) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: {
					choices: matchingUsers.slice(0, 20).map((user) => ({
						name: mentionUser(user, true),
						value: user.id.toString(),
					})),
				},
			},
		);
	}

	function showListFailure(): unknown {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Failed to display warnings',
						description: `The warnings for the given user could not be shown.`,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	if (matchingUsers.length === 0) return void showListFailure();

	const user = matchingUsers[0]!;

	const subject = await client.database.getOrCreateUser(
		'id',
		user.id.toString(),
	);
	if (!subject) return void showListFailure();

	const warnings = await client.database.getWarnings(subject.ref);
	if (!warnings) return void showListFailure();

	const pages = chunk(
		warnings,
		configuration.interactions.responses.resultsPerPage,
	);

	return paginate({
		interaction: interaction,
		elements: pages,
		embed: { color: configuration.interactions.responses.colors.blue },
		view: {
			title: 'Warnings',
			generate: (warnings) =>
				warnings.length === 0
					? `This user hasn't received any warnings.`
					: list(
						warnings.map((warning) =>
							`${trim(warning.data.reason, 50)} (${
								dayjs(warning.ts).fromNow()
							})`
						),
					),
		},
		show: false,
	});
}

export default command;
