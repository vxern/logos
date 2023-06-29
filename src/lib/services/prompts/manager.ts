import {
	Bot,
	Channel,
	CreateMessage,
	deleteMessage,
	Guild,
	Interaction,
	InteractionTypes,
	Message,
	sendMessage,
	User as DiscordUser,
} from "discordeno";
import { User } from "../../database/structs/user.js";
import { BaseDocumentProperties, Document } from "../../database/document.js";
import { stringifyValue } from "../../database/database.js";
import { Client, extendEventHandler, isServicing, WithLanguage } from "../../client.js";
import { createInteractionCollector, decodeId } from "../../interactions.js";
import { getAllMessages, getTextChannel } from "../../utils.js";
import constants from "../../../constants.js";

type InteractionDataBase = [userId: string, guildId: string, reference: string];

type InteractionHandler<InteractionData extends [...InteractionDataBase, ...string[]]> = (
	bot: Bot,
	interaction: Interaction,
	data: InteractionData,
) => void;

abstract class PromptManager<
	DataType extends BaseDocumentProperties,
	Metadata extends Record<string, unknown> & { userId: bigint; reference: string },
	InteractionData extends [...InteractionDataBase, ...string[]],
> {
	readonly customId: string;
	readonly channelName: string;

	readonly type: string;

	private readonly handlers: Map<string, InteractionHandler<InteractionData>> = new Map();

	private readonly channelIds: Map</*guildId: */ bigint, bigint> = new Map();

	private readonly prompts: Map</*reference: */ string, Message> = new Map();

	private readonly documents: Map</*promptId: */ bigint, Document<DataType>> = new Map();
	private readonly userIds: Map</*promptId: */ bigint, bigint> = new Map();

	constructor({ customId, channelName, type }: { customId: string; channelName: string; type: string }) {
		this.customId = customId;
		this.channelName = channelName;
		this.type = type;
	}

	start([client, bot]: [Client, Bot]): void {
		this.listen([client, bot]);
		this.registerOldPrompts([client, bot]);
		this.ensurePersistence([client, bot]);
	}

	private listen([client, bot]: [Client, Bot]): void {
		createInteractionCollector([client, bot], {
			type: InteractionTypes.MessageComponent,
			customId: this.customId,
			doesNotExpire: true,
			onCollect: async (bot, selection) => {
				if (!isServicing(client, selection.guildId!)) {
					return;
				}

				const [_, userId, guildId, reference, ...metadata] = decodeId<InteractionData>(selection.data!.customId!);

				const handle = this.handlers.get([userId, guildId, reference].join(constants.symbols.meta.idSeparator));
				if (handle === undefined) {
					return;
				}

				handle(bot, selection, [userId, guildId, reference, ...metadata] as InteractionData);
			},
		});
	}

	private registerOldPrompts([client, bot]: [Client, Bot]): void {
		const documentsByGuildId = this.getAllDocuments(client);

		extendEventHandler(bot, "guildCreate", { append: true }, async (bot, { id: guildId }) => {
			if (!isServicing(client, guildId)) {
				return;
			}

			const guild = client.cache.guilds.get(guildId)!;

			client.log.info(`Registering ${this.type} prompts on ${guild.name} (${guild.id})...`);

			const channel = this.getChannel(client, guild);
			if (channel === undefined) {
				return;
			}

			this.channelIds.set(guild.id, channel.id);

			const promptsAll = (await getAllMessages([client, bot], channel.id)) ?? [];
			const [valid, invalid] = this.filterPrompts(promptsAll);

			const documents = documentsByGuildId.get(guild.id) ?? [];
			const prompts = this.sortPrompts(valid);

			for (const document of documents) {
				const userDocument = await this.getUserDocument(client, document);
				if (userDocument === undefined) {
					continue;
				}

				const userId = BigInt(userDocument.data.account.id);
				const reference = stringifyValue(document.ref);

				let prompt: Message;
				if (prompts.get(userId)?.has(reference) ?? false) {
					prompt = prompts.get(userId)!.get(reference)!;
					prompts.get(userId)?.delete(reference);
				} else {
					const user = client.cache.users.get(userId);
					if (user === undefined) {
						continue;
					}

					const message = await this.savePrompt([client, bot], guild, channel, user, document);
					if (message === undefined) {
						continue;
					}

					prompt = message;
				}

				this.registerPrompt(prompt, userId, reference, document);
				this.registerHandler(client, [userId.toString(), guild.id.toString(), reference]);
			}

			const expired = Array.from(prompts.values()).flatMap((map) => Array.from(map.values()));

			for (const prompt of [...invalid, ...expired]) {
				await deleteMessage(bot, prompt.channelId, prompt.id);
			}
		});
	}

	private ensurePersistence([client, bot]: [Client, Bot]): void {
		// Anti-tampering feature; detects prompts being deleted.
		extendEventHandler(bot, "messageDelete", { prepend: true }, async (_, { id: promptId, channelId, guildId }) => {
			if (!isServicing(client, guildId!)) {
				return;
			}

			// If the message was deleted from a channel not managed by this prompt manager.
			if (this.channelIds.get(guildId!) !== channelId) {
				return;
			}

			const guild = client.cache.guilds.get(guildId!);
			if (guild === undefined) {
				return;
			}

			const channel = client.cache.channels.get(channelId);
			if (channel === undefined) {
				return;
			}

			const document = this.documents.get(promptId);
			if (document === undefined) {
				return;
			}

			const userId = this.userIds.get(promptId);
			if (userId === undefined) {
				return;
			}

			const user = client.cache.users.get(userId);
			if (user === undefined) {
				return;
			}

			const reference = stringifyValue(document.ref);

			const prompt = await this.savePrompt([client, bot], guild, channel, user, document);
			if (prompt === undefined) {
				return;
			}

			this.registerPrompt(prompt, userId, reference, document);

			this.documents.delete(promptId);
			this.userIds.delete(promptId);
		});

		// Anti-tampering feature; detects embeds being deleted from prompts.
		extendEventHandler(bot, "messageUpdate", { prepend: true }, (bot, { id: promptId, channelId, guildId, embeds }) => {
			if (!isServicing(client, guildId!)) {
				return;
			}

			// If the message was updated in a channel not managed by this prompt manager.
			if (this.channelIds.get(guildId!) !== channelId) {
				return;
			}

			// If the embed is still present, it wasn't an embed having been deleted. Do not do anything.
			if (embeds.length === 1) {
				return;
			}

			// Delete the message and allow the bot to handle the deletion.
			deleteMessage(bot, channelId, promptId);
		});
	}

	abstract getAllDocuments(client: Client): Map</*guildId: */ bigint, Document<DataType>[]>;
	abstract getUserDocument(client: Client, document: Document<DataType>): Promise<Document<User> | undefined>;

	abstract decodeMetadata(data: string[]): Metadata | undefined;

	abstract getPromptContent(
		[client, bot]: [Client, Bot],
		guild: WithLanguage<Guild>,
		user: DiscordUser,
		document: Document<DataType>,
	): CreateMessage;

	getMetadata(prompt: Message): string[] | undefined {
		const metadata = prompt.embeds.at(0)?.footer?.text;
		if (metadata === undefined) {
			return undefined;
		}

		const data = metadata.split(constants.symbols.meta.metadataSeparator);
		return data;
	}

	getChannel(client: Client, guild: Guild): Channel | undefined {
		const channel = getTextChannel(guild, this.channelName);
		if (channel === undefined) {
			client.log.error(
				`Failed to register previous entry requests on ${guild.name}: There is no verification channel.`,
			);
			return;
		}

		return channel;
	}

	filterPrompts(prompts: Message[]): [valid: [Message, Metadata][], invalid: Message[]] {
		const valid: [Message, Metadata][] = [];
		const invalid: Message[] = [];
		for (const prompt of prompts) {
			const data = this.getMetadata(prompt);
			if (data === undefined) {
				invalid.push(prompt);
				continue;
			}

			const metadata = this.decodeMetadata(data);
			if (metadata === undefined) {
				invalid.push(prompt);
				continue;
			}

			valid.push([prompt, metadata]);
		}
		return [valid, invalid];
	}

	sortPrompts(prompts: [Message, Metadata][]): Map</*userId: */ bigint, Map</*reference: */ string, Message>> {
		const promptsSorted = new Map<bigint, Map<string, Message>>();

		for (const [prompt, metadata] of prompts) {
			const { userId, reference } = metadata;

			if (!promptsSorted.has(userId)) {
				promptsSorted.set(userId, new Map([[reference, prompt]]));
				continue;
			}

			promptsSorted.get(userId)?.set(reference, prompt);
		}

		return promptsSorted;
	}

	async savePrompt(
		[client, bot]: [Client, Bot],
		guild: WithLanguage<Guild>,
		channel: Channel,
		user: DiscordUser,
		document: Document<DataType>,
	): Promise<Message | undefined> {
		const content = this.getPromptContent([client, bot], guild, user, document);
		const message = await sendMessage(bot, channel.id, content).catch(() => {
			client.log.warn(`Failed to send message in channel with ID ${channel.id}.`);
			return undefined;
		});
		return message;
	}

	registerPrompt(prompt: Message, userId: bigint, reference: string, document: Document<DataType>): void {
		this.documents.set(prompt.id, document);
		this.userIds.set(prompt.id, userId);
		this.prompts.set(reference, prompt);
	}

	unregisterPrompt(prompt: Message, reference: string): void {
		this.documents.delete(prompt.id);
		this.userIds.delete(prompt.id);
		this.prompts.delete(reference);
	}

	registerHandler(client: Client, data: InteractionDataBase): void {
		this.handlers.set(data.join(constants.symbols.meta.idSeparator), async (bot, interaction) => {
			const [_, userId, guildId, reference, ...metadata] = decodeId<InteractionData>(interaction.data!.customId!);

			const updatedDocument = await this.handleInteraction([client, bot], interaction, [
				userId,
				guildId,
				reference,
				...metadata,
			] as InteractionData);
			if (updatedDocument === undefined) {
				return;
			}

			const prompt = this.prompts.get(reference);
			if (prompt === undefined) {
				return;
			}

			if (updatedDocument === null) {
				this.unregisterPrompt(prompt, reference);
			} else {
				this.documents.set(prompt.id, updatedDocument);
			}

			deleteMessage(bot, prompt.channelId, prompt.id);
		});
	}

	abstract handleInteraction(
		[client, bot]: [Client, Bot],
		interaction: Interaction,
		data: InteractionData,
	): Promise<Document<DataType> | undefined | null>;
}

export { PromptManager };
