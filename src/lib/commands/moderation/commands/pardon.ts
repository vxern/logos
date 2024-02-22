import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { MentionTypes, mention } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { Guild, timeStructToMilliseconds } from "../../../database/guild";
import { Warning } from "../../../database/warning";
import { CommandTemplate } from "../../command";
import { user } from "../../parameters";
import { getActiveWarnings } from "../module";

const command: CommandTemplate = {
	id: "pardon",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["MODERATE_MEMBERS"],
	handle: handlePardonUser,
	handleAutocomplete: handlePardonUserAutocomplete,
	options: [
		user,
		{
			id: "warning",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
	],
};

async function handlePardonUserAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; warning: string }>,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.features.moderation.features?.warns;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	if (interaction.parameters.focused === undefined) {
		return;
	}

	switch (interaction.parameters.focused) {
		case "user": {
			client.autocompleteMembers(interaction, {
				identifier: interaction.parameters.user,
				options: {
					restrictToNonSelf: true,
					excludeModerators: true,
				},
			});
			break;
		}
		case "warning": {
			const member = client.resolveInteractionToMember(
				interaction,
				{
					identifier: interaction.parameters.user,
					options: {
						restrictToNonSelf: true,
						excludeModerators: true,
					},
				},
				{ locale },
			);
			if (member === undefined) {
				client.respond(interaction, []);
				return;
			}

			const expiryMilliseconds = timeStructToMilliseconds(configuration.expiration ?? defaults.WARN_EXPIRY);

			const relevantWarnings = await getRelevantWarnings(client, member, expiryMilliseconds);
			if (relevantWarnings === undefined) {
				client.respond(interaction, []);
				return;
			}

			const warningLowercase = interaction.parameters.warning.toLowerCase();
			const choices = relevantWarnings
				.map<Discord.ApplicationCommandOptionChoice>((warning) => ({
					name: warning.reason,
					value: warning.partialId,
				}))
				.filter((choice) => choice.name.toLowerCase().includes(warningLowercase));

			client.respond(interaction, choices);
			break;
		}
	}
}

async function handlePardonUser(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; warning: string }>,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.features.moderation.features?.warns;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const member = client.resolveInteractionToMember(
		interaction,
		{
			identifier: interaction.parameters.user,
			options: {
				restrictToNonSelf: true,
				excludeModerators: true,
			},
		},
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	const expiryMilliseconds = timeStructToMilliseconds(configuration.expiration ?? defaults.WARN_EXPIRY);

	const relevantWarnings = await getRelevantWarnings(client, member, expiryMilliseconds);
	if (relevantWarnings === undefined) {
		displayFailedError(client, interaction, { locale });
		return;
	}

	const warning = relevantWarnings.find(
		(relevantWarning) => relevantWarning.partialId === interaction.parameters.warning,
	);
	if (warning === undefined) {
		displayInvalidWarningError(client, interaction, { locale });
		return;
	}

	await warning.delete(client);

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	if (configuration.journaling) {
		const journallingService = client.getJournallingService(guild.id);
		journallingService?.log("memberWarnRemove", { args: [member, warning, interaction.user] });
	}

	const strings = {
		title: client.localise("pardon.strings.pardoned.title", locale)(),
		description: client.localise(
			"pardon.strings.pardoned.description",
			locale,
		)({
			user_mention: mention(member.id, MentionTypes.User),
			reason: warning.reason,
		}),
	};

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.lightGreen,
			},
		],
	});
}

async function getRelevantWarnings(
	client: Client,
	member: Logos.Member,
	expirationMilliseconds: number,
): Promise<Warning[] | undefined> {
	const warningDocuments = await Warning.getAll(client, { where: { targetId: member.id.toString() } });

	const relevantWarnings = getActiveWarnings(warningDocuments, expirationMilliseconds).reverse();
	return relevantWarnings;
}

async function displayInvalidWarningError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("pardon.strings.invalidWarning.title", locale)(),
		description: client.localise("pardon.strings.invalidWarning.description", locale)(),
	};

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			},
		],
	});
}

async function displayFailedError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("pardon.strings.failed.title", locale)(),
		description: client.localise("pardon.strings.failed.description", locale)(),
	};

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			},
		],
	});
}

export default command;
