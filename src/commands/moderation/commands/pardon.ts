import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
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
import { getOrCreateUser } from '../../../database/functions/users.ts';
import {
	deleteWarning,
	getWarnings,
} from '../../../database/functions/warnings.ts';
import { user } from '../../parameters.ts';
import { getRelevantWarnings } from '../module.ts';
import { log } from '../../../controllers/logging.ts';
import { displayTime, mention, MentionTypes } from '../../../formatting.ts';
import {
	createLocalisations,
	localise,
} from '../../../../assets/localisations/types.ts';
import { Commands } from '../../../../assets/localisations/commands.ts';
import { defaultLanguage } from '../../../types.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.pardon),
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	handle: unwarnUser,
	options: [
		user,
		{
			...createLocalisations(Commands.pardon.options.warning),
			type: ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
	],
};

async function unwarnUser(
	[client, bot]: [Client, Bot],
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
		[client, bot],
		interaction,
		userIdentifier,
	);
	if (!member) return;

	const displayErrorOrEmptyChoices = (): void => {
		if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
			return void sendInteractionResponse(
				bot,
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
					data: { choices: [] },
				},
			);
		}

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
							Commands.pardon.strings.failed,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	};

	const subject = await getOrCreateUser(
		client.database,
		'id',
		member.id.toString(),
	);
	if (!subject) return displayErrorOrEmptyChoices();

	const warnings = await getWarnings(client.database, subject.ref);
	if (!warnings) return displayErrorOrEmptyChoices();

	const relevantWarnings = getRelevantWarnings(warnings);
	relevantWarnings.reverse();

	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: {
					choices: relevantWarnings.map((warning) => ({
						name: `${warning.data.reason} (${displayTime(warning.ts)})`,
						value: warning.ref.value.id,
					})),
				},
			},
		);
	}

	const displayUnwarnError = (description: string): void => {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
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
			localise(Commands.pardon.strings.alreadyRemoved, interaction.locale),
		);
	}

	const warning = await deleteWarning(client.database, warningToRemove);
	if (!warning) {
		return displayUnwarnError(
			localise(Commands.pardon.strings.failed, interaction.locale),
		);
	}

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	log(
		[client, bot],
		guild,
		'memberWarnRemove',
		member,
		warning.data,
		interaction.user,
	);

	sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: localise(
						Commands.pardon.strings.pardoned,
						interaction.locale,
					)(mention(member.id, MentionTypes.User), warning.data.reason),
					color: configuration.interactions.responses.colors.green,
				}],
			},
		},
	);

	const dmChannel = await getDmChannel(bot, member.id);
	if (!dmChannel) return;

	return void sendMessage(bot, dmChannel.id, {
		embeds: [
			{
				thumbnail: (() => {
					const iconURL = getGuildIconURL(bot, guild.id, guild.icon, {
						size: 64,
						format: 'webp',
					});
					if (!iconURL) return;

					return { url: iconURL };
				})(),
				description: localise(
					Commands.pardon.strings.pardonedDirect,
					defaultLanguage,
				)(warning.data.reason, displayTime(warning.ts)),
				color: configuration.interactions.responses.colors.green,
			},
		],
	});
}

export default command;
