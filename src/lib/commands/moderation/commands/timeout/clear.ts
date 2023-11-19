import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import * as Logos from "../../../../../types";
import { Client, autocompleteMembers, localise, resolveInteractionToMember } from "../../../../client";
import diagnostics from "../../../../diagnostics";
import { parseArguments, reply } from "../../../../interactions";
import { Guild } from "../../../../database/guild";
import { MentionTypes, mention } from "../../../../../formatting";

async function handleClearTimeoutAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	autocompleteMembers([client, bot], interaction, user, { restrictToNonSelf: true, excludeModerators: true });
}

async function handleClearTimeout([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument =
		client.cache.documents.guilds.get(guildId.toString()) ??
		(await client.database.session.load<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));
	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.moderation.features?.timeouts;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ user: userSearchQuery }] = parseArguments(interaction.data?.options, {});
	if (userSearchQuery === undefined) {
		return;
	}

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		userSearchQuery,
		{
			restrictToNonSelf: true,
			excludeModerators: true,
		},
		{ locale },
	);
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
			title: localise(client, "timeout.strings.notTimedOut.title", locale)(),
			description: localise(
				client,
				"timeout.strings.notTimedOut.description",
				locale,
			)({ user_mention: mention(user.id, MentionTypes.User) }),
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

	await bot.rest
		.editMember(guildId, member.id, { communicationDisabledUntil: null })
		.catch(() => client.log.warn(`Failed to remove timeout of ${diagnostics.display.member(member)}.`));

	if (configuration.journaling) {
		const journallingService = client.services.journalling.get(guild.id);
		journallingService?.log("memberTimeoutRemove", { args: [member, interaction.user] });
	}

	const strings = {
		title: localise(client, "timeout.strings.timeoutCleared.title", locale)(),
		description: localise(
			client,
			"timeout.strings.timeoutCleared.description",
			locale,
		)({ user_mention: mention(user.id, MentionTypes.User) }),
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
