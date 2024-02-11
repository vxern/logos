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
import { editReply, parseArguments, postponeReply, reply } from "../../../interactions";
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

	let session = client.database.openSession();

	const guildDocument =
		client.documents.guilds.get(guildId.toString()) ??
		(await session.get<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

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

		reply(client, interaction, {
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

	await postponeReply(client, interaction);

	session = client.database.openSession();

	const [authorDocument, targetDocument] = [
		client.documents.users.get(interaction.user.id.toString()) ??
			(await session.get<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined)) ??
			(await (async () => {
				const userDocument = {
					...({
						id: `users/${interaction.user.id}`,
						account: { id: interaction.user.id.toString() },
						createdAt: Date.now(),
					} satisfies User),
					"@metadata": { "@collection": "Users" },
				};
				await session.set(userDocument);
				await session.saveChanges();

				return userDocument as User;
			})()),
		client.documents.users.get(member.id.toString()) ??
			(await session.get<User>(`users/${member.id}`).then((value) => value ?? undefined)) ??
			(await (async () => {
				const userDocument = {
					...({
						id: `users/${member.id}`,
						account: { id: member.id.toString() },
						createdAt: Date.now(),
					} satisfies User),
					"@metadata": { "@collection": "Users" },
				};
				await session.set(userDocument);
				await session.saveChanges();

				return userDocument as User;
			})()),
	];

	session.dispose();

	if (authorDocument === undefined || targetDocument === undefined) {
		displayError(client, interaction, { locale });
		return;
	}

	session = client.database.openSession();

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

		editReply(client, interaction, {
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

	editReply(client, interaction, {
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

	editReply(client, interaction, {
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
