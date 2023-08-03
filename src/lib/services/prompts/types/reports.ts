import constants from "../../../../constants/constants";
import defaults from "../../../../defaults";
import { MentionTypes, mention, timestamp } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { stringifyValue } from "../../../database/database";
import { Document } from "../../../database/document";
import { Report } from "../../../database/structs/report";
import { User } from "../../../database/structs/user";
import { encodeId, reply } from "../../../interactions";
import { getGuildIconURLFormatted } from "../../../utils";
import { PromptService } from "../service";
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

	getPromptContent(bot: Discord.Bot, user: Logos.User, document: Document<Report>): Discord.CreateMessage | undefined {
		const guild = this.guild;
		if (guild === undefined) {
			return;
		}

		const reference = stringifyValue(document.ref);

		const strings = {
			report: {
				submittedBy: localise(this.client, "submittedBy", defaults.LOCALISATION_LOCALE)(),
				submittedAt: localise(this.client, "submittedAt", defaults.LOCALISATION_LOCALE)(),
				users: localise(this.client, "reports.users", defaults.LOCALISATION_LOCALE)(),
				reason: localise(this.client, "reports.reason", defaults.LOCALISATION_LOCALE)(),
				link: localise(this.client, "reports.link", defaults.LOCALISATION_LOCALE)(),
				noLinkProvided: localise(this.client, "reports.noLinkProvided", defaults.LOCALISATION_LOCALE)(),
			},
			previousInfractions: {
				title: localise(this.client, "reports.previousInfractions", defaults.LOCALISATION_LOCALE),
			},
			markResolved: localise(this.client, "markResolved", defaults.LOCALISATION_LOCALE)(),
			markUnresolved: localise(this.client, "markUnresolved", defaults.LOCALISATION_LOCALE)(),
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
				title: localise(this.client, "alreadyMarkedResolved.title", defaults.LOCALISATION_LOCALE)(),
				description: localise(this.client, "alreadyMarkedResolved.description", defaults.LOCALISATION_LOCALE)(),
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
				title: localise(this.client, "alreadyMarkedUnresolved.title", defaults.LOCALISATION_LOCALE)(),
				description: localise(this.client, "alreadyMarkedUnresolved.description", defaults.LOCALISATION_LOCALE)(),
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
