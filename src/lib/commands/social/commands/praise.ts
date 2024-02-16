import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { MentionTypes, mention } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { Guild, timeStructToMilliseconds } from "../../../database/guild";
import { Praise } from "../../../database/praise";
import { User } from "../../../database/user";
import { parseArguments } from "../../../interactions";
import { verifyIsWithinLimits } from "../../../utils";
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

async function handlePraiseUserAutocomplete(client: Client, interaction: Logos.Interaction): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	client.autocompleteMembers(interaction, { identifier: user });
}

async function handlePraiseUser(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.features.social.features?.praises;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ user, comment }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	const member = client.resolveInteractionToMember(interaction, { identifier: user }, { locale });
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

	const [authorDocument, targetDocument] = await Promise.all([
		User.getOrCreate(client, { userId: interaction.user.id.toString() }),
		User.getOrCreate(client, { userId: member.id.toString() }),
	]);

	const session = client.database.openSession();

	const praiseDocumentsCached = client.documents.praisesByAuthor.get(interaction.user.id.toString());
	const praiseDocuments =
		praiseDocumentsCached !== undefined
			? Array.from(praiseDocumentsCached.values())
			: await session
					.query<Praise>({ collection: "Praises" })
					.whereRegex("id", `^praises/\\d+/${interaction.user.id}/\\d+$`)
					.all()
					.then((praiseDocuments) => {
						const map = new Map(
							praiseDocuments.map((praiseDocument) => [
								`${praiseDocument.targetId}/${praiseDocument.authorId}/${praiseDocument.createdAt}`,
								praiseDocument,
							]),
						);
						client.documents.praisesByAuthor.set(interaction.user.id.toString(), map);
						return praiseDocuments;
					});

	session.dispose();

	const intervalMilliseconds = timeStructToMilliseconds(configuration.rateLimit?.within ?? defaults.PRAISE_INTERVAL);

	if (
		!verifyIsWithinLimits(
			praiseDocuments.map((suggestionDocument) => suggestionDocument.createdAt),
			configuration.rateLimit?.uses ?? defaults.PRAISE_LIMIT,
			intervalMilliseconds,
		)
	) {
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

	session = client.database.openSession();
	const createdAt = Date.now();
	const praiseDocument = {
		id: `praises/${targetDocument.account.id}/${authorDocument.account.id}/${createdAt}`,
		authorId: authorDocument.account.id,
		targetId: targetDocument.account.id,
		comment,
		createdAt,
		"@metadata": { "@collection": "Praises" },
	};
	await session.set(praiseDocument);
	await session.saveChanges();
	session.dispose();

	if (configuration.journaling) {
		const journallingService = client.getJournallingService(guild.id);
		journallingService?.log("praiseAdd", { args: [member, praiseDocument, interaction.user] });
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
