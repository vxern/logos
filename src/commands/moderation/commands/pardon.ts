import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	getDmChannel,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder } from 'logos/src/commands/mod.ts';
import { Client, configuration, guildAsAuthor, parseArguments, resolveInteractionToMember } from 'logos/src/mod.ts';
import { log } from 'logos/src/controllers/logging/mod.ts';
import { deleteWarning, getOrCreateUser, getWarnings } from 'logos/src/database/functions/mod.ts';
import { user } from 'logos/src/commands/mod.ts';
import { getRelevantWarnings } from 'logos/src/commands/moderation/mod.ts';
import { displayTime, mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLanguage } from 'logos/types.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.pardon),
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	handle: pardonUser,
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

async function pardonUser(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user, warning }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		user,
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

	const subject = await getOrCreateUser(client, 'id', member.id.toString());
	if (!subject) return displayErrorOrEmptyChoices();

	const warnings = await getWarnings(client, subject.ref);
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

	const warningToRemove = relevantWarnings.find((relevantWarning) => relevantWarning.ref.value.id === warning);
	if (!warningToRemove) {
		return displayUnwarnError(
			localise(Commands.pardon.strings.alreadyRemoved, interaction.locale),
		);
	}

	const deletedWarning = await deleteWarning(client, warningToRemove);
	if (!deletedWarning) {
		return displayUnwarnError(
			localise(Commands.pardon.strings.failed, interaction.locale),
		);
	}

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	log([client, bot], guild, 'memberWarnRemove', member, deletedWarning.data, interaction.user);

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
					)(mention(member.id, MentionTypes.User), deletedWarning.data.reason),
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
				author: guildAsAuthor(bot, guild),
				description: localise(
					Commands.pardon.strings.pardonedDirect,
					defaultLanguage,
				)(deletedWarning.data.reason, displayTime(deletedWarning.ts)),
				color: configuration.interactions.responses.colors.green,
			},
		],
	});
}

export default command;
