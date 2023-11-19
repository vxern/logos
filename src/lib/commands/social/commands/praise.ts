import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { MentionTypes, mention } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, autocompleteMembers, localise, resolveInteractionToMember } from "../../../client";
import { Guild, timeStructToMilliseconds } from "../../../database/guild";
import { Praise } from "../../../database/praise";
import { editReply, parseArguments, postponeReply, reply } from "../../../interactions";
import { verifyIsWithinLimits } from "../../../utils";
import { CommandTemplate } from "../../command";
import { user } from "../../parameters";
import { User } from "../../../database/user";

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

	const session = client.database.openSession();

	const guildDocument =
		client.cache.documents.guilds.get(guildId.toString()) ??
		(await session.load<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));
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

	const [authorDocument, targetDocument] = [
		client.cache.documents.users.get(interaction.user.id.toString()) ??
			(await session.load<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined)) ??
			(await (async () => {
				const userDocument = {
					...({
						id: `users/${interaction.user.id}`,
						account: { id: interaction.user.id.toString() },
						createdAt: Date.now(),
					} satisfies User),
					"@metadata": { "@collection": "Users" },
				};
				await session.store(userDocument);
				await session.saveChanges();

				return userDocument as User;
			})()),
		client.cache.documents.users.get(member.id.toString()) ??
			(await session.load<User>(`users/${member.id}`).then((value) => value ?? undefined)) ??
			(await (async () => {
				const userDocument = {
					...({
						id: `users/${member.id}`,
						account: { id: member.id.toString() },
						createdAt: Date.now(),
					} satisfies User),
					"@metadata": { "@collection": "Users" },
				};
				await session.store(userDocument);
				await session.saveChanges();

				return userDocument as User;
			})()),
	];

	if (authorDocument === undefined || targetDocument === undefined) {
		displayError([client, bot], interaction, { locale });
		return;
	}

	const praiseDocumentsCached = client.cache.documents.praisesByAuthor.get(interaction.user.id.toString());
	const praiseDocuments =
		praiseDocumentsCached !== undefined
			? Array.from(praiseDocumentsCached.values())
			: await session
					.query<Praise>({ collection: "Praises" })
					.whereRegex("id", `^praises\/\d+\/${interaction.user.id}\/\d+$`)
					.all()
					.then((praiseDocuments) => {
						const map = new Map(
							praiseDocuments.map((praiseDocument) => [
								`${praiseDocument.targetId}/${praiseDocument.authorId}/${praiseDocument.createdAt}`,
								praiseDocument,
							]),
						);
						client.cache.documents.praisesByAuthor.set(interaction.user.id.toString(), map);
						return praiseDocuments;
					});

	const intervalMilliseconds = timeStructToMilliseconds(configuration.rateLimit?.within ?? defaults.PRAISE_INTERVAL);

	if (
		!verifyIsWithinLimits(
			praiseDocuments.map((suggestionDocument) => suggestionDocument.createdAt),
			configuration.rateLimit?.uses ?? defaults.PRAISE_LIMIT,
			intervalMilliseconds,
		)
	) {
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

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const createdAt = Date.now();
	const praiseDocument = {
		id: `praises/${targetDocument.account.id}/${authorDocument.account.id}/${createdAt}`,
		authorId: authorDocument.account.id,
		targetId: targetDocument.account.id,
		comment,
		createdAt,
		"@metadata": { "@collection": "Praises" },
	};
	await session.store(praiseDocument);
	await session.saveChanges();

	if (configuration.journaling) {
		const journallingService = client.services.journalling.get(guild.id);
		journallingService?.log("praiseAdd", { args: [member, praiseDocument, interaction.user] });
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
