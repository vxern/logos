import constants from "../../../../constants/constants";
import { MentionTypes, mention, timestamp } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { stringifyValue } from "../../../database/database";
import { Document } from "../../../database/document";
import { Report } from "../../../database/structs/report";
import { User } from "../../../database/structs/user";
import { encodeId, getLocaleData, reply } from "../../../interactions";
import { getGuildIconURLFormatted } from "../../../utils";
import { PromptService } from "../service";
import * as Discord from "@discordeno/bot";

type Metadata = { userId: bigint; reference: string };
type InteractionData = [userId: string, guildId: string, reference: string, isResolved: string];

class ReportService extends PromptService<"reports", Report, Metadata, InteractionData> {
	constructor([client, bot]: [Client, Discord.Bot], guildId: bigint) {
		super([client, bot], guildId, { type: "reports" });
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

	getPromptContent(user: Logos.User, document: Document<Report>): Discord.CreateMessageOptions | undefined {
		const guild = this.guild;
		if (guild === undefined) {
			return;
		}

		const reference = stringifyValue(document.ref);

		const guildLocale = this.guildLocale;
		const strings = {
			report: {
				submittedBy: localise(this.client, "submittedBy", guildLocale)(),
				submittedAt: localise(this.client, "submittedAt", guildLocale)(),
				users: localise(this.client, "reports.users", guildLocale)(),
				reason: localise(this.client, "reports.reason", guildLocale)(),
				link: localise(this.client, "reports.link", guildLocale)(),
				noLinkProvided: localise(this.client, "reports.noLinkProvided", guildLocale)(),
			},
			previousInfractions: {
				title: localise(this.client, "reports.previousInfractions", guildLocale),
			},
			markResolved: localise(this.client, "markResolved", guildLocale)(),
			markUnresolved: localise(this.client, "markUnresolved", guildLocale)(),
		};

		return {
			embeds: [
				{
					title: document.data.answers.reason,
					color: constants.colors.darkRed,
					thumbnail: (() => {
						const iconURL = Discord.avatarUrl(user.id, user.discriminator, {
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
									customId: encodeId<InteractionData>(constants.components.reports, [
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
									customId: encodeId<InteractionData>(constants.components.reports, [
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
		interaction: Discord.Interaction,
		data: InteractionData,
	): Promise<Document<Report> | null | undefined> {
		const localeData = await getLocaleData(this.client, interaction);
		const locale = localeData.locale;

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
				title: localise(this.client, "alreadyMarkedResolved.title", locale)(),
				description: localise(this.client, "alreadyMarkedResolved.description", locale)(),
			};

			reply([this.client, this.bot], interaction, {
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
				title: localise(this.client, "alreadyMarkedUnresolved.title", locale)(),
				description: localise(this.client, "alreadyMarkedUnresolved.description", locale)(),
			};

			reply([this.client, this.bot], interaction, {
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
