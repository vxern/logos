import * as Discord from "@discordeno/bot";
import constants from "../../../constants/constants";
import * as Logos from "../../../types";
import { Client } from "../../client";
import { Guild } from "../../database/guild";
import { User } from "../../database/user";
import diagnostics from "../../diagnostics";
import { createInteractionCollector, decodeId } from "../../interactions";
import { getAllMessages } from "../../utils";
import { LocalService } from "../service";

interface Configurations {
	reports: NonNullable<Guild["features"]["moderation"]["features"]>["reports"];
	suggestions: NonNullable<Guild["features"]["server"]["features"]>["suggestions"];
	verification: NonNullable<Guild["features"]["moderation"]["features"]>["verification"];
}

type ConfigurationLocators = {
	[K in keyof Configurations]: (guildDocument: Guild) => Configurations[K] | undefined;
};

const configurationLocators: ConfigurationLocators = {
	reports: (guildDocument) => guildDocument.features.moderation.features?.reports,
	suggestions: (guildDocument) => guildDocument.features.server.features?.suggestions,
	verification: (guildDocument) => guildDocument.features.moderation.features?.verification,
};

type CustomIDs = Record<keyof Configurations, string>;

const customIds: CustomIDs = {
	reports: constants.components.reports,
	suggestions: constants.components.suggestions,
	verification: constants.components.verification,
};

type PromptTypes = keyof Client["services"]["prompts"];

abstract class PromptService<
	PromptType extends PromptTypes,
	DataType extends { id: string },
	InteractionData extends [compositeId: string, ...data: string[]],
> extends LocalService {
	private readonly type: PromptType;
	private readonly customId: string;

	protected readonly documents: Map<string, DataType>;

	private readonly handlerByCompositeId: Map<
		/*compositeId: */ string,
		(interaction: Discord.Interaction, data: InteractionData) => void
	> = new Map();
	private readonly promptByCompositeId: Map</*compositeId: */ string, Discord.CamelizedDiscordMessage> = new Map();
	private readonly documentByPromptId: Map</*promptId: */ string, DataType> = new Map();
	private readonly userIdByPromptId: Map</*promptId: */ string, bigint> = new Map();

	private readonly _configuration: ConfigurationLocators[PromptType];
	get configuration(): Configurations[PromptType] | undefined {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return undefined;
		}

		return this._configuration(guildDocument);
	}

	get channelId(): bigint | undefined {
		const configuration = this.configuration;
		if (configuration === undefined) {
			return undefined;
		}

		if (!configuration.enabled) {
			return undefined;
		}

		const channelId = BigInt(configuration.channelId);
		if (channelId === undefined) {
			return undefined;
		}

		return channelId;
	}

	constructor([client, bot]: [Client, Discord.Bot], guildId: bigint, { type }: { type: PromptType }) {
		super([client, bot], guildId);
		this.type = type;
		this.customId = customIds[type];
		this.documents = this.getAllDocuments();
		this._configuration = configurationLocators[type];
	}

	async start(): Promise<void> {
		const [channelId, configuration, guild, guildDocument] = [
			this.channelId,
			this.configuration,
			this.guild,
			this.guildDocument,
		];
		if (channelId === undefined || configuration === undefined || guild === undefined || guildDocument === undefined) {
			return;
		}

		this.client.log.info(`Registering ${this.type} prompts on ${diagnostics.display.guild(guild)}...`);

		const promptsAll = (await getAllMessages([this.client, this.bot], channelId)) ?? [];
		const [validPrompts, invalidPrompts] = this.filterPrompts(promptsAll);

		const prompts = new Map(validPrompts);

		for (const [compositeId, promptDocument] of this.documents) {
			const userDocument = await this.getUserDocument(promptDocument);
			if (userDocument === undefined) {
				continue;
			}

			const userId = BigInt(userDocument.account.id);

			let prompt = prompts.get(promptDocument.id);
			if (prompt !== undefined) {
				prompts.delete(promptDocument.id);
			} else {
				const user = this.client.cache.users.get(userId);
				if (user === undefined) {
					continue;
				}

				const message = await this.savePrompt(user, promptDocument);
				if (message === undefined) {
					continue;
				}

				prompt = message;
			}

			this.registerDocument(compositeId, promptDocument);
			this.registerPrompt(prompt, userId, compositeId, promptDocument);
			this.registerHandler(compositeId);
		}

		const expiredPrompts = Array.from(prompts.values());

		for (const prompt of [...invalidPrompts, ...expiredPrompts]) {
			await this.bot.rest.deleteMessage(prompt.channelId, prompt.id).catch(() => {
				this.client.log.warn("Failed to delete prompt.");
			});
		}

		createInteractionCollector([this.client, this.bot], {
			type: Discord.InteractionTypes.MessageComponent,
			customId: this.customId,
			doesNotExpire: true,
			onCollect: async (selection) => {
				const customId = selection.data?.customId;
				if (customId === undefined) {
					return;
				}

				const [_, compositeId, ...metadata] = decodeId<InteractionData>(customId);
				if (compositeId === undefined) {
					return;
				}

				const handle = this.handlerByCompositeId.get(compositeId);
				if (handle === undefined) {
					return;
				}

				handle(selection, [compositeId, ...metadata] as InteractionData);
			},
		});
	}

	// Anti-tampering feature; detects prompts being deleted.
	async messageDelete(message: Discord.Message): Promise<void> {
		// If the message was deleted from a channel not managed by this prompt manager.
		if (message.channelId !== this.channelId) {
			return;
		}

		const promptDocument = this.documentByPromptId.get(message.id.toString());
		if (promptDocument === undefined) {
			return;
		}

		const userId = this.userIdByPromptId.get(message.id.toString());
		if (userId === undefined) {
			return;
		}

		const user = this.client.cache.users.get(userId);
		if (user === undefined) {
			return;
		}

		const prompt = await this.savePrompt(user, promptDocument);
		if (prompt === undefined) {
			return;
		}

		const compositeId = this.getCompositeId(prompt);
		if (compositeId === undefined) {
			return;
		}

		this.registerPrompt(prompt, userId, compositeId, promptDocument);

		this.documentByPromptId.delete(message.id.toString());
		this.userIdByPromptId.delete(message.id.toString());
	}

	async messageUpdate(message: Discord.Message): Promise<void> {
		// If the message was updated in a channel not managed by this prompt manager.
		if (message.channelId !== this.channelId) {
			return;
		}

		// If the embed is still present, it wasn't an embed having been deleted. Do not do anything.
		if (message.embeds?.length === 1) {
			return;
		}

		// Delete the message and allow the bot to handle the deletion.
		this.bot.rest
			.deleteMessage(message.channelId, message.id)
			.catch(() =>
				this.client.log.warn(
					`Failed to delete prompt ${diagnostics.display.message(message)} from ${diagnostics.display.channel(
						message.channelId,
					)} on ${diagnostics.display.guild(message.guildId ?? 0n)}.`,
				),
			);
	}

	abstract getAllDocuments(): Map<string, DataType>;
	abstract getUserDocument(promptDocument: DataType): Promise<User | undefined>;

	abstract getPromptContent(user: Logos.User, promptDocument: DataType): Discord.CreateMessageOptions | undefined;

	getCompositeId(prompt: Discord.CamelizedDiscordMessage): string | undefined {
		const compositeId = prompt.embeds?.at(-1)?.footer?.iconUrl?.split("&metadata=").at(-1);
		if (compositeId === undefined) {
			return undefined;
		}

		return compositeId;
	}

	filterPrompts(
		prompts: Discord.CamelizedDiscordMessage[],
	): [
		valid: [compositeId: string, prompt: Discord.CamelizedDiscordMessage][],
		invalid: Discord.CamelizedDiscordMessage[],
	] {
		const valid: [compositeId: string, prompt: Discord.CamelizedDiscordMessage][] = [];
		const invalid: Discord.CamelizedDiscordMessage[] = [];

		for (const prompt of prompts) {
			const compositeId = this.getCompositeId(prompt);
			if (compositeId === undefined) {
				invalid.push(prompt);
				continue;
			}

			valid.push([compositeId, prompt]);
		}

		return [valid, invalid];
	}

	async savePrompt(user: Logos.User, promptDocument: DataType): Promise<Discord.CamelizedDiscordMessage | undefined> {
		const channelId = this.channelId;
		if (channelId === undefined) {
			return undefined;
		}

		const content = this.getPromptContent(user, promptDocument);
		if (content === undefined) {
			return undefined;
		}

		const message = await this.bot.rest.sendMessage(channelId, content).catch(() => {
			this.client.log.warn(`Failed to send message to ${diagnostics.display.channel(channelId)}.`);
			return undefined;
		});

		return message;
	}

	registerDocument(compositeId: string, promptDocument: DataType): void {
		this.documents.set(compositeId, promptDocument);
	}

	unregisterDocument(compositeId: string): void {
		this.documents.delete(compositeId);
	}

	registerPrompt(
		prompt: Discord.CamelizedDiscordMessage,
		userId: bigint,
		compositeId: string,
		promptDocument: DataType,
	): void {
		this.documentByPromptId.set(prompt.id, promptDocument);
		this.userIdByPromptId.set(prompt.id, userId);
		this.promptByCompositeId.set(compositeId, prompt);
	}

	unregisterPrompt(prompt: Discord.CamelizedDiscordMessage, compositeId: string): void {
		this.documentByPromptId.delete(prompt.id);
		this.userIdByPromptId.delete(prompt.id);
		this.promptByCompositeId.delete(compositeId);
	}

	registerHandler(compositeId: string): void {
		this.handlerByCompositeId.set(compositeId, async (interaction) => {
			const customId = interaction.data?.customId;
			if (customId === undefined) {
				return;
			}

			const [_, compositeId, ...metadata] = decodeId<InteractionData>(customId);

			const updatedDocument = await this.handleInteraction(interaction, [compositeId, ...metadata] as InteractionData);
			if (updatedDocument === undefined) {
				return;
			}

			const prompt = this.promptByCompositeId.get(compositeId);
			if (prompt === undefined) {
				return;
			}

			if (updatedDocument === null) {
				this.unregisterDocument(compositeId);
				this.unregisterPrompt(prompt, compositeId);
				this.unregisterHandler(compositeId);
			} else {
				this.documentByPromptId.set(prompt.id, updatedDocument);
			}

			this.bot.rest.deleteMessage(prompt.channelId, prompt.id).catch(() => {
				this.client.log.warn("Failed to delete prompt.");
			});
		});
	}

	unregisterHandler(compositeId: string): void {
		this.handlerByCompositeId.delete(compositeId);
	}

	abstract handleInteraction(
		interaction: Discord.Interaction,
		data: InteractionData,
	): Promise<DataType | undefined | null>;
}

export { PromptService, Configurations };
