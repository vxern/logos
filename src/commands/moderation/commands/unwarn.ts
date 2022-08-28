import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	dayjs,
	fetchMembers,
	getDmChannel,
	getGuildIconURL,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
	sendMessage,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { mentionUser, resolveUserIdentifier } from '../../../utils.ts';
import { user } from '../../parameters.ts';
import { getRelevantWarnings } from '../module.ts';

const command: CommandBuilder = {
	name: 'unwarn',
	nameLocalizations: {
		pl: 'usuń-ostrzeżenie',
		ro: 'șterge-un-avertisment',
	},
	description: 'Removes the last given warning to a user.',
	descriptionLocalizations: {
		pl: 'Usuwa ostatnie ostrzeżenie dane użytkownikowi.',
		ro: 'Șterge ultimul avertisment dat unui utilizator.',
	},
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	handle: unwarnUser,
	options: [
		user,
		{
			name: 'warning',
			nameLocalizations: {
				pl: 'ostrzeżenie',
				ro: 'avertisment',
			},
			description: 'The warning to remove.',
			descriptionLocalizations: {
				pl: 'Ostrzeżenie, które ma zostać usunięte.',
				ro: 'Avertismentul care să fie șters.',
			},
			type: ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
	],
};

async function unwarnUser(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const data = interaction.data;
	if (!data) return;

	const userIdentifierOption = data.options?.at(0);
	const warningOption = data.options?.at(1);
	if (!userIdentifierOption || !warningOption) return;

	const userIdentifier = <string | undefined> userIdentifierOption.value;
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
		interaction.type === InteractionTypes.ApplicationCommandAutocomplete &&
		userIdentifierOption.focused
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

	function showUnwarnFailure(): unknown {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Failed to pardon user',
						description: `The member may have already left the server.`,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	if (matchingUsers.length === 0) return void showUnwarnFailure();

	function displayEmptyChoices(): unknown {
		return sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: { choices: [] },
			},
		);
	}

	const user = matchingUsers[0]!;

	const subject = await client.database.getOrCreateUser(
		'id',
		user.id.toString(),
	);
	if (!subject) {
		return void (interaction.type ===
				InteractionTypes.ApplicationCommandAutocomplete
			? displayEmptyChoices()
			: showUnwarnFailure());
	}

	const warnings = await client.database.getWarnings(subject.ref);
	if (!warnings) {
		return void (interaction.type ===
				InteractionTypes.ApplicationCommandAutocomplete
			? displayEmptyChoices()
			: showUnwarnFailure());
	}

	const relevantWarnings = getRelevantWarnings(warnings);
	relevantWarnings.reverse();

	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: {
					choices: relevantWarnings.map((warning) => ({
						name: `${warning.data.reason} (${dayjs(warning.ts).fromNow()})`,
						value: warning.ref.value.id,
					})),
				},
			},
		);
	}

	const warningReferenceID = <string> warningOption.value!;
	const warningToRemove = relevantWarnings.find((warning) =>
		warning.ref.value.id === warningReferenceID
	);
	if (!warningToRemove) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Warning already removed',
						description: `The selected warning has already been removed.`,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	const warning = await client.database.deleteWarning(warningToRemove);
	if (!warning) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Failed to remove warning',
						description: `The selected warning failed to be removed.`,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	const member = client.members.get(user.id);
	if (!member) return;

	client.logging.get(interaction.guildId!)?.log(
		'memberWarnRemove',
		member,
		warning.data,
		interaction.user,
	);

	sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: 'User pardoned',
					description:
						`The user has been pardoned from their warning for: ${warning.data.reason}`,
					color: configuration.interactions.responses.colors.green,
				}],
			},
		},
	);

	const dmChannel = await getDmChannel(client.bot, interaction.user.id);
	if (!dmChannel) return;

	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	return void sendMessage(client.bot, dmChannel.id, {
		embeds: [
			{
				thumbnail: (() => {
					const iconURL = getGuildIconURL(client.bot, guild.id, guild.icon);
					if (!iconURL) return undefined;

					return {
						url: iconURL,
					};
				})(),
				title: 'You have been pardoned',
				description: `The warning for '${warning.data.reason}' given to you ${
					dayjs(warning.ts).fromNow()
				} has been dispelled.`,
				color: configuration.interactions.responses.colors.green,
			},
		],
	});
}

export default command;
