import {
	ApplicationCommandFlags,
	ApplicationCommandOptionChoice,
	ApplicationCommandOptionTypes,
	ApplicationCommandTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	Member,
	sendInteractionResponse,
} from 'discordeno';
import { getActiveWarnings } from 'logos/src/commands/moderation/module.ts';
import { CommandTemplate } from 'logos/src/commands/command.ts';
import { user } from 'logos/src/commands/parameters.ts';
import { logEvent } from 'logos/src/controllers/logging/logging.ts';
import { autocompleteMembers, Client, localise, resolveInteractionToMember } from 'logos/src/client.ts';
import { isAutocomplete, parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';
import { Document } from 'logos/src/database/document.ts';
import { Warning } from 'logos/src/database/structs/mod.ts';

const command: CommandTemplate = {
	name: 'pardon',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	handle: handlePardonUser,
	handleAutocomplete: handlePardonUserAutocomplete,
	options: [
		user,
		{
			name: 'warning',
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
	if (subject === undefined) return void displayErrorOrEmptyChoices([client, bot], interaction);

	const warnings = await client.database.adapters.warnings.getOrFetch(client, 'recipient', subject.ref);
	if (warnings === undefined) return void displayErrorOrEmptyChoices([client, bot], interaction);

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
				name: warning.data.reason,
				value: warning.ref.value.id,
			}))
			.filter((choice) => choice.name.toLowerCase().includes(warningLowercase));

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
		const strings = {
			title: localise(client, 'pardon.strings.invalidWarning.title', interaction.locale)(),
			description: localise(client, 'pardon.strings.invalidWarning.description', interaction.locale)(),
		};

		return displayError(bot, interaction, strings.title, strings.description);
	}

	const deletedWarning = await client.database.adapters.warnings.delete(client, warningToDelete);
	if (deletedWarning === undefined) {
		const strings = {
			title: localise(client, 'pardon.strings.failed.title', interaction.locale)(),
			description: localise(client, 'pardon.strings.failed.description', interaction.locale)(),
		};

		return displayError(bot, interaction, strings.title, strings.description);
	}

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	logEvent([client, bot], guild, 'memberWarnRemove', [member, deletedWarning.data, interaction.user]);

	const strings = {
		title: localise(client, 'pardon.strings.pardoned.title', interaction.locale)(),
		description: localise(client, 'pardon.strings.pardoned.description', interaction.locale)({
			'user_mention': mention(member.id, MentionTypes.User),
			'reason': deletedWarning.data.reason,
		}),
	};

	sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: strings.title,
					description: strings.description,
					color: constants.colors.lightGreen,
				}],
			},
		},
	);
}

function displayErrorOrEmptyChoices([client, bot]: [Client, Bot], interaction: Interaction): void {
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

	const strings = {
		title: localise(client, 'pardon.strings.failed.title', interaction.locale)(),
		description: localise(client, 'pardon.strings.failed.description', interaction.locale)(),
	};

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				}],
			},
		},
	);
}

function displayError(bot: Bot, interaction: Interaction, title: string, description: string): void {
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title,
					description,
					color: constants.colors.red,
				}],
			},
		},
	);
}

export default command;
