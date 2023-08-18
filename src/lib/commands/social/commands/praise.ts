import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { MentionTypes, mention } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, autocompleteMembers, localise, resolveInteractionToMember } from "../../../client";
import { timeStructToMilliseconds } from "../../../database/structs/guild";
import { Praise } from "../../../database/structs/praise";
import { editReply, parseArguments, postponeReply, reply } from "../../../interactions";
import { verifyIsWithinLimits } from "../../../utils";
import { CommandTemplate } from "../../command";
import { user } from "../../parameters";
import * as Discord from "@discordeno/bot";

const command: CommandTemplate = {
	name: "praise",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handlePraiseUser,
	handleAutocomplete: handlePraiseUserAutocomplete,
	options: [
		user,
		{
			name: "comment",
			type: Discord.ApplicationCommandOptionTypes.String,
		},
	],
};

async function handlePraiseUserAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	autocompleteMembers([client, bot], interaction, user);
}

async function handlePraiseUser([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

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

	const configuration = guildDocument.data.features.social.features?.praises;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ user, comment }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	const member = resolveInteractionToMember([client, bot], interaction, user, {}, { locale });
	if (member === undefined) {
		return;
	}

	if (member.id === interaction.member?.id) {
		const strings = {
			title: localise(client, "praise.strings.cannotPraiseSelf.title", locale)(),
			description: localise(client, "praise.strings.cannotPraiseSelf.description", locale)(),
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

	await postponeReply([client, bot], interaction);

	const [author, subject] = await Promise.all([
		client.database.adapters.users.getOrFetchOrCreate(
			client,
			"id",
			interaction.user.id.toString(),
			interaction.user.id,
		),
		client.database.adapters.users.getOrFetchOrCreate(client, "id", member.id.toString(), member.id),
	]);

	if (author === undefined || subject === undefined) {
		displayError([client, bot], interaction, { locale });
		return;
	}

	const praisesBySender = await client.database.adapters.praises.getOrFetch(client, "sender", author.ref);
	if (praisesBySender === undefined) {
		displayError([client, bot], interaction, { locale });
		return;
	}

	const intervalMilliseconds = timeStructToMilliseconds(configuration.rateLimit?.within ?? defaults.PRAISE_INTERVAL);

	const praises = Array.from(praisesBySender.values());
	if (!verifyIsWithinLimits(praises, configuration.rateLimit?.uses ?? defaults.PRAISE_LIMIT, intervalMilliseconds)) {
		const strings = {
			title: localise(client, "praise.strings.tooMany.title", locale)(),
			description: localise(client, "praise.strings.tooMany.description", locale)(),
		};

		editReply([client, bot], interaction, {
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

	const praise: Praise = {
		createdAt: Date.now(),
		sender: author.ref,
		recipient: subject.ref,
		comment: comment,
	};

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const document = await client.database.adapters.praises.create(client, praise);
	if (document === undefined) {
		displayError([client, bot], interaction, { locale });
		return;
	}

	if (configuration.journaling) {
		const journallingService = client.services.journalling.get(guild.id);
		journallingService?.log("praiseAdd", { args: [member, praise, interaction.user] });
	}

	const strings = {
		title: localise(client, "praise.strings.praised.title", locale)(),
		description: localise(
			client,
			"praise.strings.praised.description",
			locale,
		)({ user_mention: mention(member.id, MentionTypes.User) }),
	};

	editReply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.lightGreen,
			},
		],
	});
}

async function displayError(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: localise(client, "praise.strings.failed.title", locale)(),
		description: localise(client, "praise.strings.failed.description", locale)(),
	};

	editReply([client, bot], interaction, {
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
