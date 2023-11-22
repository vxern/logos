import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { Report } from "../../../database/report";
import { User } from "../../../database/user";
import { encodeId, getLocaleData, reply } from "../../../interactions";
import { getGuildIconURLFormatted } from "../../../utils";
import { PromptService } from "../service";
import diagnostics from "../../../diagnostics";

type InteractionData = [documentId: string, isResolved: string];

class ReportService extends PromptService<"reports", Report, InteractionData> {
	constructor([client, bot]: [Client, Discord.Bot], guildId: bigint) {
		super([client, bot], guildId, { type: "reports", isDeletable: true });
	}

	getAllDocuments(): Map<string, Report> {
		const reports = new Map<string, Report>();

		for (const [compositeId, reportDocument] of this.client.cache.documents.reports) {
			if (reportDocument.guildId !== this.guildIdString) {
				continue;
			}

			reports.set(compositeId, reportDocument);
		}

		return reports;
	}

	async getUserDocument(reportDocument: Report): Promise<User | undefined> {
		const session = this.client.database.openSession();

		const userDocument =
			this.client.cache.documents.users.get(reportDocument.authorId) ??
			session.load<User>(`users/${reportDocument.authorId}`).then((value) => value ?? undefined);

		session.dispose();

		return userDocument;
	}

	getPromptContent(user: Logos.User, reportDocument: Report): Discord.CreateMessageOptions | undefined {
		const guild = this.guild;
		if (guild === undefined) {
			return;
		}

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
			remove: localise(this.client, "remove", guildLocale)(),
		};

		return {
			embeds: [
				{
					color: reportDocument.isResolved ? constants.colors.green : constants.colors.peach,
					thumbnail: (() => {
						const iconURL = Discord.avatarUrl(user.id, user.discriminator, {
							avatar: user.avatar,
							size: 128,
							format: "webp",
						});
						if (iconURL === undefined) {
							return;
						}

						return { url: iconURL };
					})(),
					fields: [
						{
							name: diagnostics.display.user(user),
							value: reportDocument.answers.reason,
							inline: false,
						},
						{
							name: strings.report.users,
							value: reportDocument.answers.users,
							inline: true,
						},
						{
							name: strings.report.link,
							value:
								reportDocument.answers.messageLink !== undefined
									? reportDocument.answers.messageLink
									: `*${strings.report.noLinkProvided}*`,
							inline: true,
						},
					],
					footer: {
						text: guild.name,
						iconUrl: `${getGuildIconURLFormatted(guild)}&metadata=${reportDocument.guildId}/${
							reportDocument.authorId
						}/${reportDocument.createdAt}`,
					},
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: reportDocument.isResolved
						? [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Success,
									label: strings.markUnresolved,
									customId: encodeId<InteractionData>(constants.components.reports, [
										`${reportDocument.guildId}/${reportDocument.authorId}/${reportDocument.createdAt}`,
										`${false}`,
									]),
								},

								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Danger,
									label: strings.remove,
									customId: encodeId(`${constants.components.removePrompt}/${constants.components.reports}`, [
										`${reportDocument.guildId}/${reportDocument.authorId}/${reportDocument.createdAt}`,
									]),
								},
						  ]
						: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Primary,
									label: strings.markResolved,
									customId: encodeId<InteractionData>(constants.components.reports, [
										`${reportDocument.guildId}/${reportDocument.authorId}/${reportDocument.createdAt}`,
										`${true}`,
									]),
								},
						  ],
				},
			],
		};
	}

	async handleInteraction(interaction: Discord.Interaction, data: InteractionData): Promise<Report | null | undefined> {
		const localeData = await getLocaleData(this.client, interaction);
		const locale = localeData.locale;

		const [compositeId, isResolvedString] = data;
		const isResolved = isResolvedString === "true";

		const reportDocument = this.documents.get(compositeId);
		if (reportDocument === undefined) {
			return undefined;
		}

		if (isResolved && reportDocument.isResolved) {
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

		if (!(isResolved || reportDocument.isResolved)) {
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

		const session = this.client.database.openSession();

		reportDocument.isResolved = isResolved;

		await session.store(reportDocument);
		await session.saveChanges();

		session.dispose();

		return reportDocument;
	}
}

export { ReportService };
