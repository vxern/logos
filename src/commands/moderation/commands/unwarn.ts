import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	dayjs,
	getDmChannel,
	getGuildIconURL,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
	sendMessage,
} from '../../../../deps.ts';
import { Client, resolveInteractionToMember } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { user } from '../../parameters.ts';
import { getRelevantWarnings } from '../module.ts';

const command: CommandBuilder = {
	name: 'pardon',
	nameLocalizations: {
		pl: 'ułaskawienie',
		ro: 'grațiere',
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

	const userIdentifierOption = data.options?.find((option) =>
		option.name === 'user'
	);
	const warningOption = data.options?.find((option) =>
		option.name === 'warning'
	);
	if (!userIdentifierOption && !warningOption) return;

	const userIdentifier = <string | undefined> userIdentifierOption?.value;
	if (userIdentifier === undefined) return;

	const member = resolveInteractionToMember(
		client,
		interaction,
		userIdentifier,
	);
	if (!member) return;

	const displayErrorOrEmptyChoices = (): void => {
		if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
			return void sendInteractionResponse(
				client.bot,
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
					data: { choices: [] },
				},
			);
		}

		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: `The member may have already left the server.`,
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
	if (!subject) return displayErrorOrEmptyChoices();

	const warnings = await client.database.getWarnings(subject.ref);
	if (!warnings) return displayErrorOrEmptyChoices();

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

	const displayUnwarnError = (title: string, description: string): void => {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: title,
						description: description,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	};

	const warningReferenceID = <string> warningOption!.value!;
	const warningToRemove = relevantWarnings.find((warning) =>
		warning.ref.value.id === warningReferenceID
	);
	if (!warningToRemove) {
		return displayUnwarnError(
			'Warning already removed',
			'The selected warning has already been removed.',
		);
	}

	const warning = await client.database.deleteWarning(warningToRemove);
	if (!warning) {
		return displayUnwarnError(
			'Failed to remove warning',
			'The selected warning failed to be removed.',
		);
	}

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

	const dmChannel = await getDmChannel(client.bot, member.id);
	if (!dmChannel) return;

	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	return void sendMessage(client.bot, dmChannel.id, {
		embeds: [
			{
				thumbnail: (() => {
					const iconURL = getGuildIconURL(client.bot, guild.id, guild.icon, {
						size: 4096,
						format: 'webp',
					});
					if (!iconURL) return;

					return { url: iconURL };
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
