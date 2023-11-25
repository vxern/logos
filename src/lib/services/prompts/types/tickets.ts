import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { Ticket } from "../../../database/ticket";
import { User } from "../../../database/user";
import diagnostics from "../../../diagnostics";
import { encodeId, getLocaleData, reply } from "../../../interactions";
import { PromptService } from "../service";

type InteractionData = [documentId: string, isResolved: string];

class TicketService extends PromptService<"tickets", Ticket, InteractionData> {
	constructor([client, bot]: [Client, Discord.Bot], guildId: bigint) {
		super([client, bot], guildId, { type: "tickets", deleteMode: "close" });
	}

	getAllDocuments(): Map<string, Ticket> {
		const tickets = new Map<string, Ticket>();

		for (const [compositeId, ticketDocument] of this.client.cache.documents.tickets) {
			if (ticketDocument.type !== "standalone") {
				continue;
			}

			if (ticketDocument.guildId !== this.guildIdString) {
				continue;
			}

			tickets.set(compositeId, ticketDocument);
		}

		return tickets;
	}

	async getUserDocument(ticketDocument: Ticket): Promise<User | undefined> {
		const session = this.client.database.openSession();

		const userDocument =
			this.client.cache.documents.users.get(ticketDocument.authorId) ??
			session.load<User>(`users/${ticketDocument.authorId}`).then((value) => value ?? undefined);

		session.dispose();

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
			markResolved: localise(this.client, "markResolved", guildLocale)(),
			markUnresolved: localise(this.client, "markUnresolved", guildLocale)(),
			close: localise(this.client, "close", guildLocale)(),
			remove: localise(this.client, "remove", guildLocale)(),
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
						})()}&metadata=${ticketDocument.guildId}/${ticketDocument.authorId}/${ticketDocument.channelId}`,
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
										`${ticketDocument.guildId}/${ticketDocument.authorId}/${ticketDocument.channelId}`,
										`${false}`,
									]),
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Danger,
									label: strings.remove,
									customId: encodeId(`${constants.components.removePrompt}/${constants.components.tickets}`, [
										`${ticketDocument.guildId}/${ticketDocument.authorId}/${ticketDocument.channelId}`,
									]),
								},
						  ]
						: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Primary,
									label: strings.markResolved,
									customId: encodeId<InteractionData>(constants.components.tickets, [
										`${ticketDocument.guildId}/${ticketDocument.authorId}/${ticketDocument.channelId}`,
										`${true}`,
									]),
								},
						  ],
				},
			],
		};
	}

	async handleInteraction(interaction: Discord.Interaction, data: InteractionData): Promise<Ticket | null | undefined> {
		const localeData = await getLocaleData(this.client, interaction);
		const locale = localeData.locale;

		const [compositeId, isResolvedString] = data;
		const isResolved = isResolvedString === "true";

		const ticketDocument = this.documents.get(compositeId);
		if (ticketDocument === undefined) {
			return undefined;
		}

		if (isResolved && ticketDocument.isResolved) {
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

		if (!(isResolved || ticketDocument.isResolved)) {
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

		ticketDocument.isResolved = isResolved;

		await session.store(ticketDocument);
		await session.saveChanges();

		session.dispose();

		return ticketDocument;
	}

	public async handleDelete(compositeId: string): Promise<void> {
		await super.handleDelete(compositeId);

		const [_, __, channelId] = compositeId.split("/");
		if (channelId === undefined) {
			return;
		}

		await this.bot.helpers.deleteChannel(channelId).catch(() => {
			this.client.log.warn("Failed to delete ticket channel.");
		});
	}
}

export { TicketService };
