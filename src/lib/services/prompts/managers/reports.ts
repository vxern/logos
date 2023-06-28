import {
	Bot,
	ButtonStyles,
	CreateMessage,
	getAvatarURL,
	Guild,
	Interaction,
	MessageComponentTypes,
	User as DiscordUser,
} from "discordeno";
import { PromptManager } from "../manager.js";
import { stringifyValue } from "../../../database/database.js";
import { Document } from "../../../database/document.js";
import { Report } from "../../../database/structs/report.js";
import { User } from "../../../database/structs/user.js";
import { Client, localise, WithLanguage } from "../../../client.js";
import { encodeId, reply } from "../../../interactions.js";
import configuration from "../../../../configuration.js";
import constants from "../../../../constants.js";
import { mention, MentionTypes, timestamp } from "../../../../formatting.js";
import { defaultLocale } from "../../../../types.js";

type Metadata = { userId: bigint; reference: string };
type InteractionData = [userId: string, guildId: string, reference: string, isResolved: string];

class ReportManager extends PromptManager<Report, Metadata, InteractionData> {
	getAllDocuments(client: Client): Map<bigint, Document<Report>[]> {
		const reportsByGuildId = new Map<bigint, Document<Report>[]>();

		for (const reports of Array.from(client.database.cache.reportsByAuthorAndGuild.values()).map((reports) =>
			Array.from(reports.values()),
		)) {
			if (reports.length === 0) continue;

			const guildId = BigInt(reports.at(0)!.data.guild);

			if (!reportsByGuildId.has(guildId)) {
				reportsByGuildId.set(guildId, reports);
				continue;
			}

			reportsByGuildId.get(guildId)!.push(...reports);
		}

		return reportsByGuildId;
	}

	getUserDocument(client: Client, document: Document<Report>): Promise<Document<User> | undefined> {
		return client.database.adapters.users.getOrFetch(client, "reference", document.data.author);
	}

	decodeMetadata(data: string[]): Metadata | undefined {
		const [userId, reference] = data;
		if (userId === undefined || reference === undefined) return undefined;

		return { userId: BigInt(userId), reference };
	}

	getPromptContent(
		[client, bot]: [Client, Bot],
		guild: WithLanguage<Guild>,
		user: DiscordUser,
		document: Document<Report>,
	): CreateMessage {
		const reference = stringifyValue(document.ref);

		const strings = {
			report: {
				submittedBy: localise(client, "submittedBy", defaultLocale)(),
				submittedAt: localise(client, "submittedAt", defaultLocale)(),
				users: localise(client, "reports.users", defaultLocale)(),
				reason: localise(client, "reports.reason", defaultLocale)(),
				link: localise(client, "reports.link", defaultLocale)(),
				noLinkProvided: localise(client, "reports.noLinkProvided", defaultLocale)(),
			},
			previousInfractions: {
				title: localise(client, "reports.previousInfractions", defaultLocale),
			},
			markResolved: localise(client, "markResolved", defaultLocale)(),
			markUnresolved: localise(client, "markUnresolved", defaultLocale)(),
		};

		return {
			embeds: [
				{
					title: document.data.reason,
					color: constants.colors.darkRed,
					thumbnail: (() => {
						const iconURL = getAvatarURL(bot, user.id, user.discriminator, {
							avatar: user.avatar,
							size: 32,
							format: "webp",
						});
						if (iconURL === undefined) return;

						return { url: iconURL };
					})(),
					fields: [
						{
							name: strings.report.users,
							value: document.data.users,
						},
						{
							name: strings.report.link,
							value:
								document.data.messageLink !== undefined
									? document.data.messageLink
									: `*${strings.report.noLinkProvided}*`,
							inline: false,
						},
						{
							name: strings.report.submittedBy,
							value: mention(user.id, MentionTypes.User),
							inline: true,
						},
						{
							name: strings.report.submittedAt,
							value: timestamp(document.data.createdAt),
							inline: true,
						},
					],
					footer: { text: `${user.id}${constants.symbols.meta.metadataSeparator}${reference}` },
				},
			],
			components: [
				{
					type: MessageComponentTypes.ActionRow,
					components: [
						!document.data.isResolved
							? {
									type: MessageComponentTypes.Button,
									style: ButtonStyles.Primary,
									label: strings.markResolved,
									customId: encodeId<InteractionData>(constants.staticComponentIds.reports, [
										user.id.toString(),
										guild.id.toString(),
										reference,
										`${true}`,
									]),
							  }
							: {
									type: MessageComponentTypes.Button,
									style: ButtonStyles.Secondary,
									label: strings.markUnresolved,
									customId: encodeId<InteractionData>(constants.staticComponentIds.reports, [
										user.id.toString(),
										guild.id.toString(),
										reference,
										`${false}`,
									]),
							  },
					],
				},
			],
		};
	}

	async handleInteraction(
		[client, bot]: [Client, Bot],
		interaction: Interaction,
		data: InteractionData,
	): Promise<Document<Report> | null | undefined> {
		const [userId, guildId, reference, isResolvedString] = data;
		const isResolved = isResolvedString === "true";

		const user = await client.database.adapters.users.getOrFetch(client, "id", userId);
		if (user === undefined) return undefined;

		const documents = client.database.adapters.reports.get(client, "authorAndGuild", [user.ref, guildId]);
		if (documents === undefined) return undefined;

		const document = documents.get(reference);
		if (document === undefined) return undefined;

		if (isResolved && document.data.isResolved) {
			const strings = {
				title: localise(client, "alreadyMarkedResolved.title", defaultLocale)(),
				description: localise(client, "alreadyMarkedResolved.description", defaultLocale)(),
			};

			return void reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					},
				],
			});
		}

		if (!(isResolved || document.data.isResolved)) {
			const strings = {
				title: localise(client, "alreadyMarkedUnresolved.title", defaultLocale)(),
				description: localise(client, "alreadyMarkedUnresolved.description", defaultLocale)(),
			};

			return void reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					},
				],
			});
		}

		const updatedDocument = await client.database.adapters.reports.update(client, {
			...document,
			data: { ...document.data, isResolved },
		});

		return updatedDocument;
	}
}

const manager = new ReportManager({
	customId: constants.staticComponentIds.reports,
	channelName: configuration.guilds.channels.reports,
	type: "report",
});

export default manager;
