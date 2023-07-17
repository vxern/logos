import constants from "../../../../../constants.js";
import { Client, autocompleteMembers, localise, resolveInteractionToMember } from "../../../../client.js";
import { parseArguments, reply } from "../../../../interactions.js";
import { diagnosticMentionUser } from "../../../../utils.js";
import * as Discord from "discordeno";

async function handleClearTimeoutAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	autocompleteMembers([client, bot], interaction, user, { restrictToNonSelf: true, excludeModerators: true });
}

async function handleClearTimeout(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetchOrCreate(
		client,
		"id",
		guildId.toString(),
		guildId,
	);
	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.data.features.moderation.features?.timeouts;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ user: userSearchQuery }] = parseArguments(interaction.data?.options, {});
	if (userSearchQuery === undefined) {
		return;
	}

	const member = resolveInteractionToMember([client, bot], interaction, userSearchQuery, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
	if (member === undefined) {
		return;
	}

	const user = member.user;
	if (user === undefined) {
		return;
	}

	const timedOutUntil = member.communicationDisabledUntil ?? undefined;

	const notTimedOut = timedOutUntil === undefined || timedOutUntil < Date.now();

	if (notTimedOut) {
		const strings = {
			title: localise(client, "timeout.strings.notTimedOut.title", interaction.locale)(),
			description: localise(
				client,
				"timeout.strings.notTimedOut.description",
				interaction.locale,
			)({ user_mention: diagnosticMentionUser(user) }),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	await Discord.editMember(bot, guildId, member.id, { communicationDisabledUntil: null }).catch(() =>
		client.log.warn(`Failed to remove timeout of member with ID ${member.id}`),
	);

	if (configuration.journaling) {
		const journallingService = client.services.journalling.get(guild.id);
		journallingService?.log(bot, "memberTimeoutRemove", { args: [member, interaction.user] });
	}

	const strings = {
		title: localise(client, "timeout.strings.timeoutCleared.title", interaction.locale)(),
		description: localise(
			client,
			"timeout.strings.timeoutCleared.description",
			interaction.locale,
		)({ user_mention: diagnosticMentionUser(user) }),
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.lightGreen,
			},
		],
	});
}

export { handleClearTimeout, handleClearTimeoutAutocomplete };
