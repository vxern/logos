import configuration from "../../../../configuration.js";
import constants from "../../../../constants.js";
import { MentionTypes, mention } from "../../../../formatting.js";
import { Client, autocompleteMembers, localise, resolveInteractionToMember } from "../../../client.js";
import { Praise } from "../../../database/structs/praise.js";
import { editReply, parseArguments, postponeReply, reply } from "../../../interactions.js";
import { logEvent } from "../../../services/logging/logging.js";
import { verifyIsWithinLimits } from "../../../utils.js";
import { CommandTemplate } from "../../command.js";
import { user } from "../../parameters.js";
import * as Discord from "discordeno";

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
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	autocompleteMembers([client, bot], interaction, user);
}

async function handlePraiseUser([client, bot]: [Client, Discord.Bot], interaction: Discord.Interaction): Promise<void> {
	const [{ user, comment }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	const member = resolveInteractionToMember([client, bot], interaction, user);
	if (member === undefined) {
		return;
	}

	if (member.id === interaction.member?.id) {
		const strings = {
			title: localise(client, "praise.strings.cannotPraiseSelf.title", interaction.locale)(),
			description: localise(client, "praise.strings.cannotPraiseSelf.description", interaction.locale)(),
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
		displayError([client, bot], interaction);
		return;
	}

	const praisesBySender = await client.database.adapters.praises.getOrFetch(client, "sender", author.ref);
	if (praisesBySender === undefined) {
		displayError([client, bot], interaction);
		return;
	}

	const praises = Array.from(praisesBySender.values());
	if (!verifyIsWithinLimits(praises, configuration.commands.praise.limitUses, configuration.commands.praise.within)) {
		const strings = {
			title: localise(client, "praise.strings.tooMany.title", interaction.locale)(),
			description: localise(client, "praise.strings.tooMany.description", interaction.locale)(),
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

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const document = await client.database.adapters.praises.create(client, praise);
	if (document === undefined) {
		displayError([client, bot], interaction);
		return;
	}

	logEvent([client, bot], guild, "praiseAdd", [member, praise, interaction.user]);

	const strings = {
		title: localise(client, "praise.strings.praised.title", interaction.locale)(),
		description: localise(
			client,
			"praise.strings.praised.description",
			interaction.locale,
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

async function displayError([client, bot]: [Client, Discord.Bot], interaction: Discord.Interaction): Promise<void> {
	const strings = {
		title: localise(client, "praise.strings.failed.title", interaction.locale)(),
		description: localise(client, "praise.strings.failed.description", interaction.locale)(),
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
