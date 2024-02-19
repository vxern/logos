import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { Ticket } from "../../../database/ticket";
import { User } from "../../../database/user";
import diagnostics from "../../../diagnostics";
import { encodeId, getLocaleData } from "../../../interactions";
import { PromptService } from "../service";

type InteractionData = [documentId: string, isResolved: string];

class TicketService extends PromptService<"tickets", Ticket, InteractionData> {
	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "tickets", deleteMode: "close" });
	}

	getAllDocuments(): Map<string, Ticket> {
		const tickets = new Map<string, Ticket>();

		for (const [partialId, ticketDocument] of this.client.documents.tickets) {
			if (ticketDocument.type !== "standalone") {
				continue;
			}

			if (ticketDocument.guildId !== this.guildIdString) {
				continue;
			}

			tickets.set(partialId, ticketDocument);
		}

		return tickets;
	}

	async getUserDocument(ticketDocument: Ticket): Promise<User> {
		const userDocument = await User.getOrCreate(this.client, { userId: ticketDocument.authorId });

		return userDocument;
	}

	getPromptContent(user: Logos.User, ticketDocument: Ticket): Discord.CreateMessageOptions | undefined {
		// Inquiry tickets are hidden, and are not meant to be interactable.
		// For all intents and purposes, verification prompts are kind of like their controller.
		if (ticketDocument.type === "inquiry") {
			return undefined;
		}

		const guild = this.guild;
		if (guild === undefined) {
			return undefined;
		}

		const guildLocale = this.guildLocale;
		const strings = {
			markResolved: this.client.localise("markResolved", guildLocale)(),
			markUnresolved: this.client.localise("markUnresolved", guildLocale)(),
			close: this.client.localise("close", guildLocale)(),
		};

		return {
			embeds: [
				{
					color: ticketDocument.isResolved ? constants.colors.green : constants.colors.husky,
					description: `*${ticketDocument.answers.topic}*`,
					footer: {
						text: diagnostics.display.user(user),
						iconUrl: `${(() => {
							const iconURL = Discord.avatarUrl(user.id, user.discriminator, {
								avatar: user.avatar,
								size: 64,
								format: "png",
							});
							if (iconURL === undefined) {
								return;
							}

							return iconURL;
						})()}&metadata=${ticketDocument.partialId}`,
					},
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: ticketDocument.isResolved
						? [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Success,
									label: strings.markUnresolved,
									customId: encodeId<InteractionData>(constants.components.tickets, [
										ticketDocument.partialId,
										`${false}`,
									]),
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Danger,
									label: strings.close,
									customId: encodeId(
										`${constants.components.removePrompt}/${constants.components.tickets}/${this.guildId}`,
										[ticketDocument.partialId],
									),
								},
						  ]
						: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Primary,
									label: strings.markResolved,
									customId: encodeId<InteractionData>(constants.components.tickets, [
										ticketDocument.partialId,
										`${true}`,
									]),
								},
						  ],
				},
			],
		};
	}

	async handleInteraction(interaction: Logos.Interaction, data: InteractionData): Promise<Ticket | null | undefined> {
		const localeData = await getLocaleData(this.client, interaction);
		const locale = localeData.locale;

		const [partialId, isResolvedString] = data;
		const isResolved = isResolvedString === "true";

		const ticketDocument = this.documents.get(partialId);
		if (ticketDocument === undefined) {
			return undefined;
		}

		if (isResolved && ticketDocument.isResolved) {
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

		if (!(isResolved || ticketDocument.isResolved)) {
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

		await ticketDocument.update(this.client, () => {
			ticketDocument.isResolved = isResolved;
		});

		return ticketDocument;
	}

	public async handleDelete(ticketDocument: Ticket): Promise<void> {
		await super.handleDelete(ticketDocument);

		await this.client.bot.helpers.deleteChannel(ticketDocument.channelId).catch(() => {
			this.client.log.warn("Failed to delete ticket channel.");
		});
	}
}

export { TicketService };
