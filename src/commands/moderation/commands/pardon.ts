import {
	ApplicationCommandFlags,
	ApplicationCommandOptionChoice,
	ApplicationCommandOptionTypes,
	Bot,
	getDmChannel,
	Interaction,
	InteractionResponseTypes,
	Member,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { getActiveWarnings } from 'logos/src/commands/moderation/module.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { user } from 'logos/src/commands/parameters.ts';
import { logEvent } from 'logos/src/controllers/logging/logging.ts';
import { autocompleteMembers, Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { isAutocomplete, parseArguments } from 'logos/src/interactions.ts';
import { getAuthor } from 'logos/src/utils.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes, timestamp } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';
import { Document } from 'logos/src/database/document.ts';
import { Warning } from 'logos/src/database/structs/mod.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.pardon),
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	handle: handlePardonUser,
	handleAutocomplete: handlePardonUserAutocomplete,
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

async function getRelevantWarnings(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	member: Member,
): Promise<Document<Warning>[] | undefined> {
	const subject = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		'id',
		member.id.toString(),
		member.id,
	);
	if (subject === undefined) return void displayErrorOrEmptyChoices(bot, interaction);

	const warnings = await client.database.adapters.warnings.getOrFetch(client, 'recipient', subject.ref);
	if (warnings === undefined) return void displayErrorOrEmptyChoices(bot, interaction);

	const relevantWarnings = Array.from(getActiveWarnings(warnings).values()).toReversed();
	return relevantWarnings;
}

async function handlePardonUserAutocomplete([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user, warning }, focused] = parseArguments(interaction.data?.options, {});

	if (focused?.name === 'user') {
		return autocompleteMembers(
			[client, bot],
			interaction,
			user!,
			{
				restrictToNonSelf: true,
				excludeModerators: true,
			},
		);
	}

	if (focused?.name === 'warning') {
		if (user === undefined) return;

		const member = resolveInteractionToMember([client, bot], interaction, user, {
			restrictToNonSelf: true,
			excludeModerators: true,
		});
		if (member === undefined) return;

		const relevantWarnings = await getRelevantWarnings([client, bot], interaction, member);
		if (relevantWarnings === undefined) return;

		const warningLowercase = warning!.toLowerCase();
		const choices = relevantWarnings
			.map<ApplicationCommandOptionChoice>((warning) => ({
				name: `${warning.data.reason} (${timestamp(warning.data.createdAt)})`,
				value: warning.ref.value.id,
			}))
			.filter((choice) => choice.name.toLowerCase().includes(warningLowercase));

		console.debug(choices);

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: { choices },
			},
		);
	}
}

async function handlePardonUser([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user, warning }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
	if (member === undefined) return;

	const relevantWarnings = await getRelevantWarnings([client, bot], interaction, member);
	if (relevantWarnings === undefined) return;

	const warningToDelete = relevantWarnings.find((relevantWarning) => relevantWarning.ref.value.id === warning);
	if (warningToDelete === undefined) {
		return displayError(bot, interaction, localise(Commands.pardon.strings.invalidWarning, interaction.locale));
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

	logEvent([client, bot], guild, 'memberWarnRemove', [member, deletedWarning.data, interaction.user]);

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
					color: constants.colors.lightGreen,
				}],
			},
		},
	);

	const dmChannel = await getDmChannel(bot, member.id).catch(() => undefined);
	if (dmChannel !== undefined) {
		return void sendMessage(bot, dmChannel.id, {
			embeds: [
				{
					author: getAuthor(bot, guild),
					description: localise(Commands.pardon.strings.pardonedDirect, defaultLocale)(
						deletedWarning.data.reason,
						timestamp(deletedWarning.data.createdAt),
					),
					color: constants.colors.lightGreen,
				},
			],
		});
	}
}

function displayErrorOrEmptyChoices(bot: Bot, interaction: Interaction): void {
	if (isAutocomplete(interaction)) {
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
					color: constants.colors.red,
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
					color: constants.colors.red,
				}],
			},
		},
	);
}

export default command;
