import { codeMultiline, mention, trim } from "logos:core/formatting";
import type { Client } from "logos/client";
import type { EntryRequest } from "logos/models/entry-request.ts";
import { Model } from "logos/models/model.ts";
import { Ticket, type TicketFormData, type TicketType } from "logos/models/ticket";
import { User } from "logos/models/user";
import { PromptService } from "logos/services/prompts/service";

class TicketPromptService extends PromptService<{
	type: "tickets";
	model: Ticket;
	metadata: [partialId: string, isResolve: string];
}> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "TicketPromptService", guildId }, { type: "tickets", deleteMode: "close" });
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
		return await User.getOrCreate(this.client, { userId: ticketDocument.authorId });
	}

	getPromptContent(user: Logos.User, ticketDocument: Ticket): Discord.CreateMessageOptions | undefined {
		// Inquiry tickets are hidden, and are not meant to be interactable.
		// For all intents and purposes, verification prompts are kind of like their controller.
		if (ticketDocument.type === "inquiry") {
			return undefined;
		}

		const strings = constants.contexts.promptControls({
			localise: this.client.localise,
			locale: this.guildLocale,
		});
		return {
			embeds: [
				{
					description: `*${ticketDocument.formData.topic}*`,
					color: ticketDocument.isResolved ? constants.colours.green : constants.colours.husky,
					footer: {
						text: this.client.diagnostics.user(user),
						iconUrl: PromptService.encodePartialIdInUserAvatar({
							user,
							partialId: ticketDocument.partialId,
						}),
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
									customId: this.magicButton.encodeId([ticketDocument.partialId, `${false}`]),
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Danger,
									label: strings.close,
									customId: this.removeButton.encodeId([ticketDocument.partialId]),
								},
							]
						: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Primary,
									label: strings.markResolved,
									customId: this.magicButton.encodeId([ticketDocument.partialId, `${true}`]),
								},
							],
				},
			],
		};
	}

	async handlePromptInteraction(
		interaction: Logos.Interaction<[partialId: string, isResolve: string]>,
	): Promise<Ticket | null | undefined> {
		const ticketDocument = this.documents.get(interaction.metadata[1]);
		if (ticketDocument === undefined) {
			return undefined;
		}

		const isResolved = interaction.metadata[2] === "true";
		if (isResolved && ticketDocument.isResolved) {
			const strings = constants.contexts.alreadyMarkedResolved({
				localise: this.client.localise,
				locale: interaction.locale,
			});
			await this.client.warning(interaction, {
				title: strings.title,
				description: strings.description,
			});

			return;
		}

		if (!(isResolved || ticketDocument.isResolved)) {
			const strings = constants.contexts.alreadyMarkedResolved({
				localise: this.client.localise,
				locale: interaction.locale,
			});
			await this.client.warning(interaction, {
				title: strings.title,
				description: strings.description,
			});

			return;
		}

		await ticketDocument.update(this.client, () => {
			ticketDocument.isResolved = isResolved;
		});

		return ticketDocument;
	}

	async handleDelete(ticketDocument: Ticket): Promise<void> {
		await super.handleDelete(ticketDocument);

		await this.client.bot.helpers.deleteChannel(ticketDocument.channelId).catch(() => {
			this.log.warn("Failed to delete ticket channel.");
		});
	}

	async openTicket({
		type,
		formData,
		user,
	}: {
		type: TicketType;
		formData: TicketFormData;
		user: Logos.User;
	}): Promise<Ticket | undefined> {
		const member = this.client.entities.members.get(this.guildId)?.get(user.id);
		if (member === undefined) {
			return undefined;
		}

		const categoryChannel = this.client.entities.channels.get(BigInt(this.configuration.categoryId));
		if (categoryChannel === undefined) {
			return undefined;
		}

		const ticketService = this.client.getPromptService(this.guildId, { type: "tickets" });
		if (ticketService === undefined) {
			return undefined;
		}

		const strings = constants.contexts.inquiry({
			localise: this.client.localise,
			locale: this.guildLocale,
		});
		const channel = await this.client.bot.helpers
			.createChannel(this.guildId, {
				parentId: this.configuration.categoryId,
				name: trim(
					`${user.username}${constants.special.sigils.channelSeparator}${
						type === "standalone" ? formData.topic : strings.inquiry
					}`,
					100,
				),
				permissionOverwrites: [
					...categoryChannel.permissionOverwrites,
					{ type: Discord.OverwriteTypes.Member, id: user.id, allow: ["VIEW_CHANNEL"] },
				],
				topic: formData.topic,
			})
			.catch(() => {
				this.client.log.warn("Could not create a channel for ticket.");
				return undefined;
			});
		if (channel === undefined) {
			return undefined;
		}

		const memberMention = mention(user.id, { type: "user" });

		this.client.bot.helpers.sendMessage(channel.id, { content: memberMention }).catch(() => {
			this.client.log.warn("Failed to mention participants in ticket.");
			return undefined;
		});

		await this.client.bot.helpers
			.sendMessage(channel.id, {
				embeds: [
					{
						description: `${memberMention}: *${formData.topic}*`,
						color: constants.colours.husky,
					},
				],
			})
			.catch(() => {
				this.client.log.warn("Failed to send a topic message in the ticket channel.");
				return undefined;
			});

		if (type === "inquiry") {
			const entryRequest = this.client.documents.entryRequests.get(
				Model.buildPartialId<EntryRequest>({ guildId: this.guildIdString, authorId: user.id.toString() }),
			);
			if (entryRequest === undefined) {
				throw new Error(`Could not get entry request of ${this.client.diagnostics.user(user.id)}.`);
			}

			const strings = {
				...constants.contexts.verificationAnswers({
					localise: this.client.localise.bind(this.client),
					locale: this.guildLocale,
				}),
				...constants.contexts.verificationModal({
					localise: this.client.localise.bind(this.client),
					locale: this.guildLocale,
				}),
			};
			await this.client.bot.helpers.sendMessage(channel.id, {
				embeds: [
					{
						title: strings.verificationAnswers,
						color: constants.colours.husky,
						fields: [
							{
								name: strings.fields.reason({ language: this.guildDocument.featureLanguage }),
								value: codeMultiline(entryRequest.formData.reason),
							},
							{
								name: strings.fields.aim,
								value: codeMultiline(entryRequest.formData.aim),
							},
							{
								name: strings.fields.whereFound,
								value: codeMultiline(entryRequest.formData.whereFound),
							},
						],
					},
				],
			});
		}

		const ticketDocument = await Ticket.create(this.client, {
			guildId: this.guildIdString,
			authorId: user.id.toString(),
			channelId: channel.id.toString(),
			type,
			formData,
		});

		switch (type) {
			case "standalone": {
				await this.client.tryLog("ticketOpen", {
					guildId: this.guildId,
					journalling: this.configuration.journaling,
					args: [member, ticketDocument],
				});
				break;
			}
			case "inquiry": {
				await this.client.tryLog("inquiryOpen", {
					guildId: this.guildId,
					journalling: this.configuration.journaling,
					args: [member, ticketDocument],
				});
				break;
			}
		}

		ticketService.registerDocument(ticketDocument);
		ticketService.registerHandler(ticketDocument);

		if (type === "inquiry") {
			return ticketDocument;
		}

		const prompt = await ticketService.savePrompt(user, ticketDocument);
		if (prompt === undefined) {
			return undefined;
		}

		ticketService.registerPrompt(prompt, user.id, ticketDocument);

		return ticketDocument;
	}
}

export { TicketPromptService };
