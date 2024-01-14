import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import { MentionTypes, mention } from "../../../../../formatting";
import * as Logos from "../../../../../types";
import { Client, autocompleteMembers, localise, resolveInteractionToMember } from "../../../../client";
import { Praise } from "../../../../database/praise";
import { User } from "../../../../database/user";
import { Warning } from "../../../../database/warning";
import { getShowButton, parseArguments, reply } from "../../../../interactions";
import { OptionTemplate } from "../../../command";
import { show, user } from "../../../parameters";

const command: OptionTemplate = {
	name: "view",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	isShowable: true,
	handle: handleDisplayProfile,
	handleAutocomplete: handleDisplayProfileAutocomplete,
	options: [{ ...user, required: false }, show],
};

async function handleDisplayProfileAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	autocompleteMembers([client, bot], interaction, user);
}

async function handleDisplayProfile(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ user, show: showParameter }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const show = interaction.show ?? showParameter ?? false;
	const locale = show ? interaction.guildLocale : interaction.locale;

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		user ?? interaction.user.id.toString(),
		{},
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	const target = member.user;
	if (target === undefined) {
		return;
	}

	const session = client.database.openSession();

	const targetDocument =
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
		})());

	const praiseDocumentsByAuthorCached = client.cache.documents.praisesByAuthor.get(targetDocument.account.id);
	const praiseDocumentsByAuthor =
		praiseDocumentsByAuthorCached !== undefined
			? Array.from(praiseDocumentsByAuthorCached.values())
			: await session
					.query<Praise>({ collection: "Praises" })
					.whereRegex("id", `^praises/\\d+/${targetDocument.account.id}/\\d+$`)
					.all()
					.then((praiseDocuments) => {
						const map = new Map(
							praiseDocuments.map((praiseDocument) => [
								`${praiseDocument.targetId}/${praiseDocument.authorId}/${praiseDocument.createdAt}`,
								praiseDocument,
							]),
						);
						client.cache.documents.praisesByAuthor.set(targetDocument.account.id, map);
						return praiseDocuments;
					});

	const praiseDocumentsByTargetCached = client.cache.documents.praisesByTarget.get(targetDocument.account.id);
	const praiseDocumentsByTarget =
		praiseDocumentsByTargetCached !== undefined
			? Array.from(praiseDocumentsByTargetCached.values())
			: await session
					.query<Praise>({ collection: "Praises" })
					.whereStartsWith("id", `^praises/${targetDocument.account.id}/\\d+/\\d+$`)
					.all()
					.then((praiseDocuments) => {
						const map = new Map(
							praiseDocuments.map((praiseDocument) => [
								`${praiseDocument.targetId}/${praiseDocument.authorId}/${praiseDocument.createdAt}`,
								praiseDocument,
							]),
						);
						client.cache.documents.praisesByTarget.set(targetDocument.account.id, map);
						return praiseDocuments;
					});

	const warningDocumentsCached = client.cache.documents.warningsByTarget.get(targetDocument.account.id);
	const warningDocuments =
		warningDocumentsCached !== undefined
			? Array.from(warningDocumentsCached.values())
			: await session
					.query<Warning>({ collection: "Warnings" })
					.whereStartsWith("id", `warnings/${targetDocument.account.id}`)
					.all()
					.then((warningDocuments) => {
						const map = new Map(
							warningDocuments.map((warningDocument) => [
								`${warningDocument.targetId}/${warningDocument.authorId}/${warningDocument.createdAt}`,
								warningDocument,
							]),
						);
						client.cache.documents.warningsByTarget.set(targetDocument.account.id, map);
						return warningDocuments;
					});

	session.dispose();

	const strings = {
		title: localise(
			client,
			"profile.options.view.strings.information.title",
			locale,
		)({
			username: target.username,
		}),
		roles: localise(client, "profile.options.view.strings.information.description.roles", locale)(),
		statistics: localise(client, "profile.options.view.strings.information.description.statistics", locale)(),
		praises: localise(client, "profile.options.view.strings.information.description.praises", locale)(),
		warnings: localise(client, "profile.options.view.strings.information.description.warnings", locale)(),
		received: localise(client, "profile.options.view.strings.information.description.received", locale)(),
		sent: localise(client, "profile.options.view.strings.information.description.sent", locale)(),
	};

	const showButton = getShowButton(client, interaction, { locale });

	const components: Discord.ActionRow[] | undefined = show
		? undefined
		: [{ type: Discord.MessageComponentTypes.ActionRow, components: [showButton] }];

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: strings.title,
					thumbnail: (() => {
						const iconURL = Discord.avatarUrl(target.id, target.discriminator, {
							avatar: target.avatar,
							size: 4096,
							format: "webp",
						});
						if (iconURL === undefined) {
							return;
						}

						return { url: iconURL };
					})(),
					color: constants.colors.peach,
					fields: [
						{
							name: `${constants.symbols.profile.roles} ${strings.roles}`,
							value: member.roles.map((roleId) => mention(roleId, MentionTypes.Role)).join(" "),
							inline: false,
						},
						{
							name: `${constants.symbols.profile.statistics.statistics} ${strings.statistics}`,
							value: `${constants.symbols.profile.statistics.praises} ${strings.praises} • ${strings.received} – ${praiseDocumentsByTarget.length} • ${strings.sent} – ${praiseDocumentsByAuthor.length}
  ${constants.symbols.profile.statistics.warnings} ${strings.warnings} • ${strings.received} – ${warningDocuments.length}`,
							inline: false,
						},
					],
				},
			],
			components,
		},
		{ visible: show },
	);
}

export default command;
