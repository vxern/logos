import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import { Locale } from "../../../../../constants/languages";
import { timestamp } from "../../../../../formatting";
import * as Logos from "../../../../../types";
import { Client, autocompleteMembers, localise, resolveInteractionToMember } from "../../../../client";
import { Warning } from "../../../../database/warning";
import { parseArguments, reply } from "../../../../interactions";
import { User } from "../../../../database/user";

async function handleDisplayWarningsAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	const permissions = interaction.member?.permissions;
	if (permissions === undefined) {
		return;
	}

	const isModerator = permissions.has("MODERATE_MEMBERS");

	autocompleteMembers(
		[client, bot],
		interaction,
		user,
		// Stops normal members from viewing other people's warnings.
		{ restrictToSelf: !isModerator },
	);
}

async function handleDisplayWarnings(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const [{ user }] = parseArguments(interaction.data?.options, {});

	const permissions = interaction.member?.permissions;
	if (permissions === undefined) {
		return;
	}

	const isModerator = permissions.has("MODERATE_MEMBERS");

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		user ?? interaction.user.id.toString(),
		{
			restrictToSelf: !isModerator,
		},
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	const isSelf = member.id === interaction.user.id;

	const session = client.database.openSession();

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
	if (userDocument === undefined) {
		displayError([client, bot], interaction, { locale });
		return;
	}

	const warningDocumentsCached = client.cache.documents.warningsByTarget.get(member.id.toString());
	const warningDocuments =
		warningDocumentsCached !== undefined
			? Array.from(warningDocumentsCached.values())
			: await session
					.query<Warning>({ collection: "Warnings" })
					.whereStartsWith("id", `warnings/${member.id}`)
					.all()
					.then((documents) => {
						const map = new Map(
							documents.map((document) => [
								`${document.targetId}/${document.authorId}/${document.createdAt}`,
								document,
							]),
						);
						client.cache.documents.warningsByTarget.set(member.id.toString(), map);
						return documents;
					});

	reply([client, bot], interaction, {
		embeds: [getWarningPage(client, warningDocuments, isSelf, { locale })],
	});
}

async function displayError(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: localise(client, "list.options.warnings.strings.failed.title", locale)(),
		description: localise(client, "list.options.warnings.strings.failed.description", locale)(),
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

function getWarningPage(
	client: Client,
	warnings: Warning[],
	isSelf: boolean,
	{ locale }: { locale: Locale },
): Discord.CamelizedDiscordEmbed {
	if (warnings.length === 0) {
		if (isSelf) {
			const strings = {
				title: localise(client, "list.options.warnings.strings.noActiveWarnings.title", locale)(),
				description: localise(client, "list.options.warnings.strings.noActiveWarnings.description.self", locale)(),
			};

			return {
				title: strings.title,
				description: strings.description,
				color: constants.colors.blue,
			};
		} else {
			const strings = {
				title: localise(client, "list.options.warnings.strings.noActiveWarnings.title", locale)(),
				description: localise(client, "list.options.warnings.strings.noActiveWarnings.description.other", locale)(),
			};

			return {
				title: strings.title,
				description: strings.description,
				color: constants.colors.blue,
			};
		}
	}

	const strings = {
		title: localise(client, "list.options.warnings.strings.warnings.title", locale)(),
		warning: localise(client, "list.options.warnings.strings.warnings.description.warning", locale),
	};

	return {
		title: strings.title,
		fields: warnings.map((warning, index) => {
			const warningString = strings.warning({
				index: index + 1,
				relative_timestamp: timestamp(warning.createdAt),
			});

			return { name: `${constants.symbols.warn} ${warningString}`, value: `*${warning.reason}*` };
		}),
		color: constants.colors.blue,
	};
}

export { getWarningPage, handleDisplayWarnings, handleDisplayWarningsAutocomplete };
