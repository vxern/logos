import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../constants/defaults";
import { MentionTypes, mention } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { Guild } from "../../../database/guild";
import { Praise } from "../../../database/praise";
import { CommandTemplate } from "../../command";
import { user } from "../../parameters";

const command: CommandTemplate = {
	id: "praise",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handlePraiseUser,
	handleAutocomplete: handlePraiseUserAutocomplete,
	options: [
		user,
		{
			id: "comment",
			type: Discord.ApplicationCommandOptionTypes.String,
		},
	],
};

async function handlePraiseUserAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string }>,
): Promise<void> {
	client.autocompleteMembers(interaction, { identifier: interaction.parameters.user });
}

async function handlePraiseUser(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; comment: string | undefined }>,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.praises;
	if (configuration === undefined) {
		return;
	}

	const member = client.resolveInteractionToMember(
		interaction,
		{ identifier: interaction.parameters.user },
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	if (member.id === interaction.member?.id) {
		const strings = {
			title: client.localise("praise.strings.cannotPraiseSelf.title", locale)(),
			description: client.localise("praise.strings.cannotPraiseSelf.description", locale)(),
		};

		client.reply(interaction, {
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

	await client.postponeReply(interaction);

	const crossesRateLimit = Guild.crossesRateLimit(
		await Praise.getAll(client, { where: { authorId: interaction.user.id.toString() } }),
		configuration.rateLimit ?? defaults.PRAISE_RATE_LIMIT,
	);
	if (!crossesRateLimit) {
		const strings = {
			title: client.localise("praise.strings.tooMany.title", locale)(),
			description: client.localise("praise.strings.tooMany.description", locale)(),
		};

		client.editReply(interaction, {
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

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const praiseDocument = await Praise.create(client, {
		authorId: interaction.user.id.toString(),
		targetId: member.id.toString(),
		comment: interaction.parameters.comment,
	});

	if (configuration.journaling && guildDocument.isEnabled("journalling")) {
		const journallingService = client.getJournallingService(guild.id);
		journallingService?.logEvent("praiseAdd", { args: [member, praiseDocument, interaction.user] });
	}

	const strings = {
		title: client.localise("praise.strings.praised.title", locale)(),
		description: client.localise(
			"praise.strings.praised.description",
			locale,
		)({ user_mention: mention(member.id, MentionTypes.User) }),
	};

	client.editReply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.lightGreen,
			},
		],
	});
}

// TODO(vxern): Will be used.
async function displayError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("praise.strings.failed.title", locale)(),
		description: client.localise("praise.strings.failed.description", locale)(),
	};

	client.editReply(interaction, {
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
