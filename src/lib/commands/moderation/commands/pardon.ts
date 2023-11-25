import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { MentionTypes, mention } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, autocompleteMembers, localise, resolveInteractionToMember } from "../../../client";
import { Guild, timeStructToMilliseconds } from "../../../database/guild";
import { User } from "../../../database/user";
import { Warning } from "../../../database/warning";
import { parseArguments, reply, respond } from "../../../interactions";
import { CommandTemplate } from "../../command";
import { user } from "../../parameters";
import { getActiveWarnings } from "../module";

const command: CommandTemplate = {
	name: "pardon",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["MODERATE_MEMBERS"],
	handle: handlePardonUser,
	handleAutocomplete: handlePardonUserAutocomplete,
	options: [
		user,
		{
			name: "warning",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
	],
};

async function handlePardonUserAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const session = client.database.openSession();

	const guildDocument =
		client.cache.documents.guilds.get(guildId.toString()) ??
		(await session.load<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.moderation.features?.warns;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ user, warning }, focused] = parseArguments(interaction.data?.options, {});

	if (focused?.name === "user") {
		if (user === undefined) {
			return;
		}

		autocompleteMembers([client, bot], interaction, user, {
			restrictToNonSelf: true,
			excludeModerators: true,
		});
		return;
	}

	if (focused?.name === "warning") {
		if (user === undefined || warning === undefined) {
			respond([client, bot], interaction, []);
			return;
		}

		const member = resolveInteractionToMember(
			[client, bot],
			interaction,
			user,
			{
				restrictToNonSelf: true,
				excludeModerators: true,
			},
			{ locale },
		);
		if (member === undefined) {
			respond([client, bot], interaction, []);
			return;
		}

		const expiryMilliseconds = timeStructToMilliseconds(configuration.expiration ?? defaults.WARN_EXPIRY);

		const relevantWarnings = await getRelevantWarnings(client, member, expiryMilliseconds);
		if (relevantWarnings === undefined) {
			respond([client, bot], interaction, []);
			return;
		}

		const warningLowercase = warning.toLowerCase();
		const choices = relevantWarnings
			.map<Discord.ApplicationCommandOptionChoice>((warning) => ({
				name: warning.reason,
				value: warning.id,
			}))
			.filter((choice) => choice.name.toLowerCase().includes(warningLowercase));

		respond([client, bot], interaction, choices);
		return;
	}
}

async function handlePardonUser([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	let session = client.database.openSession();

	const guildDocument =
		client.cache.documents.guilds.get(guildId.toString()) ??
		(await session.load<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.moderation.features?.warns;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ user, warning: warningId }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		user,
		{
			restrictToNonSelf: true,
			excludeModerators: true,
		},
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	const expiryMilliseconds = timeStructToMilliseconds(configuration.expiration ?? defaults.WARN_EXPIRY);

	const relevantWarnings = await getRelevantWarnings(client, member, expiryMilliseconds);
	if (relevantWarnings === undefined) {
		displayFailedError([client, bot], interaction, { locale });
		return;
	}

	const warning = relevantWarnings.find((relevantWarning) => relevantWarning.id === warningId);
	if (warning === undefined) {
		displayInvalidWarningError([client, bot], interaction, { locale });
		return;
	}

	session = client.database.openSession();

	await session.delete(warning.id);
	await session.saveChanges();

	session.dispose();

	client.cache.documents.warningsByTarget
		.get(member.id.toString())
		?.delete(`${warning.targetId}/${warning.authorId}/${warning.createdAt}`);

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	if (configuration.journaling) {
		const journallingService = client.services.journalling.get(guild.id);
		journallingService?.log("memberWarnRemove", { args: [member, warning, interaction.user] });
	}

	const strings = {
		title: localise(client, "pardon.strings.pardoned.title", locale)(),
		description: localise(
			client,
			"pardon.strings.pardoned.description",
			locale,
		)({
			user_mention: mention(member.id, MentionTypes.User),
			reason: warning.reason,
		}),
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

async function getRelevantWarnings(
	client: Client,
	member: Logos.Member,
	expirationMilliseconds: number,
): Promise<Warning[] | undefined> {
	let session = client.database.openSession();

	const userDocument =
		client.cache.documents.users.get(member.id.toString()) ??
		(await session.load<User>(`users/${member.id}`).then((value) => value ?? undefined));

	session.dispose();

	if (userDocument === undefined) {
		return undefined;
	}

	session = client.database.openSession();

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

	session.dispose();

	const relevantWarnings = getActiveWarnings(warningDocuments, expirationMilliseconds).reverse();
	return relevantWarnings;
}

async function displayInvalidWarningError(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: localise(client, "pardon.strings.invalidWarning.title", locale)(),
		description: localise(client, "pardon.strings.invalidWarning.description", locale)(),
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

async function displayFailedError(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: localise(client, "pardon.strings.failed.title", locale)(),
		description: localise(client, "pardon.strings.failed.description", locale)(),
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

export default command;
