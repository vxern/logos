import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { Report } from "../../../database/report";
import { User } from "../../../database/user";
import diagnostics from "../../../diagnostics";
import { getGuildIconURLFormatted } from "../../../utils";
import { PromptService } from "../service";

class ReportService extends PromptService<{
	type: "reports";
	model: Report;
	metadata: [partialId: string, isResolve: string];
}> {
	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "reports", deleteMode: "delete" });
	}

	getAllDocuments(): Map<string, Report> {
		const reports = new Map<string, Report>();

		for (const [partialId, reportDocument] of this.client.documents.reports) {
			if (reportDocument.guildId !== this.guildIdString) {
				continue;
			}

			reports.set(partialId, reportDocument);
		}

		return reports;
	}

	async getUserDocument(reportDocument: Report): Promise<User> {
		const userDocument = await User.getOrCreate(this.client, { userId: reportDocument.authorId });

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
				submittedBy: this.client.localise("submittedBy", guildLocale)(),
				submittedAt: this.client.localise("submittedAt", guildLocale)(),
				users: this.client.localise("reports.users", guildLocale)(),
				reason: this.client.localise("reports.reason", guildLocale)(),
				link: this.client.localise("reports.link", guildLocale)(),
				noLinkProvided: this.client.localise("reports.noLinkProvided", guildLocale)(),
			},
			previousInfractions: {
				title: this.client.localise("reports.previousInfractions", guildLocale),
			},
			markResolved: this.client.localise("markResolved", guildLocale)(),
			markUnresolved: this.client.localise("markUnresolved", guildLocale)(),
			close: this.client.localise("close", guildLocale)(),
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
						// TODO(vxern): Create a function for this
						iconUrl: `${getGuildIconURLFormatted(guild)}&metadata=${reportDocument.partialId}`,
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
									customId: this.magicButton.encodeId([reportDocument.partialId, `${false}`]),
								},

								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Danger,
									label: strings.close,
									customId: encodeId(
										`${constants.components.removePrompt}/${constants.components.reports}/${this.guildId}`,
										[reportDocument.partialId],
									),
								},
						  ]
						: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Primary,
									label: strings.markResolved,
									customId: this.magicButton.encodeId([reportDocument.partialId, `${true}`]),
								},
						  ],
				},
			],
		};
	}

	async handlePromptInteraction(
		interaction: Logos.Interaction<[partialId: string, isResolve: string]>,
	): Promise<Report | null | undefined> {
		const locale = interaction.locale;

		const reportDocument = this.documents.get(interaction.metadata[0]);
		if (reportDocument === undefined) {
			return undefined;
		}

		const isResolved = interaction.metadata[1] === "true";

		if (isResolved && reportDocument.isResolved) {
			const strings = {
				title: this.client.localise("alreadyMarkedResolved.title", locale)(),
				description: this.client.localise("alreadyMarkedResolved.description", locale)(),
			};

			this.client.reply(interaction, {
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
				title: this.client.localise("alreadyMarkedUnresolved.title", locale)(),
				description: this.client.localise("alreadyMarkedUnresolved.description", locale)(),
			};

			this.client.reply(interaction, {
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

		await reportDocument.update(this.client, () => {
			reportDocument.isResolved = isResolved;
		});

		return reportDocument;
	}
}

export { ReportService };
