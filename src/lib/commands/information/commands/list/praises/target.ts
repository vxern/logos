import * as Discord from "@discordeno/bot";
import constants from "../../../../../../constants/constants";
import { Locale } from "../../../../../../constants/languages";
import * as Logos from "../../../../../../types";
import { Client, autocompleteMembers, localise, resolveInteractionToMember } from "../../../../../client";
import { User } from "../../../../../database/user";
import { parseArguments, reply } from "../../../../../interactions";
import { OptionTemplate } from "../../../../command";
import { user } from "../../../../parameters";
import { Praise } from "../../../../../database/praise";
import { getPraisePage } from "../praises";

const option: OptionTemplate = {
	name: "target",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPraises,
	handleAutocomplete: handleDisplayPraisesAutocomplete,
	options: [{ ...user, required: false }],
};

async function handleDisplayPraisesAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	autocompleteMembers([client, bot], interaction, user);
}

async function handleDisplayPraises(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const [{ user: userQuery }] = parseArguments(interaction.data?.options, {});

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		userQuery ?? interaction.user.id.toString(),
		{},
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	const user = member.user;
	if (user === undefined) {
		return;
	}

	const isSelf = member.id === interaction.user.id;

	let session = client.database.openSession();

	const userDocument =
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

	session.dispose();

	if (userDocument === undefined) {
		displayError([client, bot], interaction, { locale });
		return;
	}

	session = client.database.openSession();

	const praisesDocumentsCached = client.cache.documents.praisesByTarget.get(member.id.toString());
	const praiseDocuments =
		praisesDocumentsCached !== undefined
			? Array.from(praisesDocumentsCached.values())
			: await session
					.query<Praise>({ collection: "Praises" })
					.whereRegex("id", `praises/${member.id.toString()}/\\d+/\\d+`)
					.all()
					.then((documents) => {
						const map = new Map(
							documents.map((document) => [
								`${document.targetId}/${document.authorId}/${document.createdAt}`,
								document,
							]),
						);
						client.cache.documents.praisesByTarget.set(member.id.toString(), map);
						return documents;
					});

	session.dispose();

	reply([client, bot], interaction, {
		embeds: [getPraisePage(client, praiseDocuments, isSelf, "target", { locale })],
	});
}

async function displayError(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: localise(client, "list.options.praises.strings.failed.title", locale)(),
		description: localise(client, "list.options.praises.strings.failed.description", locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			},
		],
	});
}

export default option;
