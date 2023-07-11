import constants from "../../../../constants.js";
import { MentionTypes, mention, timestamp } from "../../../../formatting.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { stringifyValue } from "../../../database/database.js";
import { Document } from "../../../database/document.js";
import { Report } from "../../../database/structs/report.js";
import { User } from "../../../database/structs/user.js";
import { encodeId, reply } from "../../../interactions.js";
import { getGuildIconURLFormatted } from "../../../utils.js";
import { PromptService } from "../service.js";
import * as Discord from "discordeno";

type Metadata = { userId: bigint; reference: string };
type InteractionData = [userId: string, guildId: string, reference: string, isResolved: string];

class ReportService extends PromptService<"reports", Report, Metadata, InteractionData> {
	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "reports" });
	}

	getAllDocuments(): Document<Report>[] {
		const reportsAll: Document<Report>[] = [];

		for (const [compositeId, reports] of this.client.database.cache.reportsByAuthorAndGuild.entries()) {
			const [_, guildIdString] = compositeId.split(constants.symbols.meta.idSeparator);
			if (guildIdString === undefined) {
				continue;
			}

			if (guildIdString !== this.guildIdString) {
				continue;
			}

			reportsAll.push(...reports.values());
		}

		return reportsAll;
	}

	getUserDocument(document: Document<Report>): Promise<Document<User> | undefined> {
		return this.client.database.adapters.users.getOrFetch(this.client, "reference", document.data.author);
	}

	decodeMetadata(data: string[]): Metadata | undefined {
		const [userId, reference] = data;
		if (userId === undefined || reference === undefined) {
			return undefined;
		}

		return { userId: BigInt(userId), reference };
	}

	getPromptContent(
		bot: Discord.Bot,
		user: Discord.User,
		document: Document<Report>,
	): Discord.CreateMessage | undefined {
		const guild = this.guild;
		if (guild === undefined) {
			return;
		}

		const reference = stringifyValue(document.ref);

		const strings = {
			report: {
				submittedBy: localise(this.client, "submittedBy", defaultLocale)(),
				submittedAt: localise(this.client, "submittedAt", defaultLocale)(),
				users: localise(this.client, "reports.users", defaultLocale)(),
				reason: localise(this.client, "reports.reason", defaultLocale)(),
				link: localise(this.client, "reports.link", defaultLocale)(),
				noLinkProvided: localise(this.client, "reports.noLinkProvided", defaultLocale)(),
			},
			previousInfractions: {
				title: localise(this.client, "reports.previousInfractions", defaultLocale),
			},
			markResolved: localise(this.client, "markResolved", defaultLocale)(),
			markUnresolved: localise(this.client, "markUnresolved", defaultLocale)(),
		};

		return {
			embeds: [
				{
					title: document.data.answers.reason,
					color: constants.colors.darkRed,
					thumbnail: (() => {
						const iconURL = Discord.getAvatarURL(bot, user.id, user.discriminator, {
							avatar: user.avatar,
							size: 32,
							format: "webp",
						});
						if (iconURL === undefined) {
							return;
						}

						return { url: iconURL };
					})(),
					fields: [
						{
							name: strings.report.users,
							value: document.data.answers.users,
						},
						{
							name: strings.report.link,
							value:
								document.data.answers.messageLink !== undefined
									? document.data.answers.messageLink
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
					footer: {
						text: guild.name,
						iconUrl: `${getGuildIconURLFormatted(
							bot,
							guild,
						)}&metadata=${`${user.id}${constants.symbols.meta.metadataSeparator}${reference}`}`,
					},
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						document.data.isResolved
							? {
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Secondary,
									label: strings.markUnresolved,
									customId: encodeId<InteractionData>(constants.staticComponentIds.reports, [
										user.id.toString(),
										this.guildIdString,
										reference,
										`${false}`,
									]),
							  }
							: {
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Primary,
									label: strings.markResolved,
									customId: encodeId<InteractionData>(constants.staticComponentIds.reports, [
										user.id.toString(),
										this.guildIdString,
										reference,
										`${true}`,
									]),
							  },
					],
				},
			],
		};
	}

	async handleInteraction(
		bot: Discord.Bot,
		interaction: Discord.Interaction,
		data: InteractionData,
	): Promise<Document<Report> | null | undefined> {
		const [userId, guildId, reference, isResolvedString] = data;
		const isResolved = isResolvedString === "true";

		const user = await this.client.database.adapters.users.getOrFetch(this.client, "id", userId);
		if (user === undefined) {
			return undefined;
		}

		const documents = this.client.database.adapters.reports.get(this.client, "authorAndGuild", [user.ref, guildId]);
		if (documents === undefined) {
			return undefined;
		}

		const document = documents.get(reference);
		if (document === undefined) {
			return undefined;
		}

		if (isResolved && document.data.isResolved) {
			const strings = {
				title: localise(this.client, "alreadyMarkedResolved.title", defaultLocale)(),
				description: localise(this.client, "alreadyMarkedResolved.description", defaultLocale)(),
			};

			reply([this.client, bot], interaction, {
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

		if (!(isResolved || document.data.isResolved)) {
			const strings = {
				title: localise(this.client, "alreadyMarkedUnresolved.title", defaultLocale)(),
				description: localise(this.client, "alreadyMarkedUnresolved.description", defaultLocale)(),
			};

			reply([this.client, bot], interaction, {
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

		const updatedDocument = await this.client.database.adapters.reports.update(this.client, {
			...document,
			data: { ...document.data, isResolved },
		});

		return updatedDocument;
	}
}

export { ReportService };
