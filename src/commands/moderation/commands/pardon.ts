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
import { getOrCreateUser } from 'logos/src/database/adapters/users.ts';
import { getActiveWarnings } from 'logos/src/commands/moderation/module.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { user } from 'logos/src/commands/parameters.ts';
import { log } from 'logos/src/controllers/logging/logging.ts';
import { Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import { guildAsAuthor } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { displayTime, mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLanguage } from 'logos/types.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.pardon),
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	handle: handlePardonUser,
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

async function handlePardonUser(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user, warning }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user);
	if (member === undefined) return;

	const subject = await getOrCreateUser(client, 'id', member.id.toString());
	if (subject === undefined) return displayErrorOrEmptyChoices(bot, interaction);

	const warnings = await client.database.adapters.warnings.get(client, 'reference', subject.ref);
	if (warnings === undefined) return displayErrorOrEmptyChoices(bot, interaction);

	const relevantWarnings = getActiveWarnings(warnings).toReversed();

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

	const warningToDelete = relevantWarnings.find((relevantWarning) => relevantWarning.ref.value.id === warning);
	if (warningToDelete === undefined) {
		return displayError(
			bot,
			interaction,
			localise(Commands.pardon.strings.alreadyRemoved, interaction.locale),
		);
	}

	const deletedWarning = await client.database.adapters.warnings.delete(client, warningToDelete);
	if (deletedWarning === undefined) {
		return displayError(
			bot,
			interaction,
			localise(Commands.pardon.strings.failed, interaction.locale),
		);
	}

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

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
					description: localise(Commands.pardon.strings.pardoned, interaction.locale)(
						mention(member.id, MentionTypes.User),
						deletedWarning.data.reason,
					),
					color: configuration.messages.colors.green,
				}],
			},
		},
	);

	const dmChannel = await getDmChannel(bot, member.id).catch(() => undefined);
	if (dmChannel !== undefined) {
		return void sendMessage(bot, dmChannel.id, {
			embeds: [
				{
					author: guildAsAuthor(bot, guild),
					description: localise(Commands.pardon.strings.pardonedDirect, defaultLanguage)(
						deletedWarning.data.reason,
						displayTime(deletedWarning.ts),
					),
					color: configuration.messages.colors.green,
				},
			],
		});
	}
}

function displayErrorOrEmptyChoices(bot: Bot, interaction: Interaction): void {
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
					description: localise(Commands.pardon.strings.failed, interaction.locale),
					color: configuration.messages.colors.red,
				}],
			},
		},
	);
}

function displayError(bot: Bot, interaction: Interaction, error: string): void {
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: error,
					color: configuration.messages.colors.red,
				}],
			},
		},
	);
}

export default command;
