import constants from "../../../constants/constants";
import { Client } from "../../client";
import { stringifyValue } from "../../database/database";
import { BaseDocumentProperties, Document } from "../../database/document";
import { Guild } from "../../database/structs/guild";
import { User } from "../../database/structs/user";
import { createInteractionCollector, decodeId } from "../../interactions";
import { getAllMessages } from "../../utils";
import { LocalService } from "../service";
import * as Discord from "discordeno";

type InteractionDataBase = [userId: string, guildId: string, reference: string];

interface Configurations {
	reports: NonNullable<Guild["features"]["moderation"]["features"]>["reports"];
	suggestions: NonNullable<Guild["features"]["server"]["features"]>["suggestions"];
	verification: NonNullable<Guild["features"]["moderation"]["features"]>["verification"];
}

type ConfigurationLocators = {
	[K in keyof Configurations]: (guildDocument: Document<Guild>) => Configurations[K] | undefined;
};

const configurationLocators: ConfigurationLocators = {
	reports: (guildDocument) => guildDocument.data.features.moderation.features?.reports,
	suggestions: (guildDocument) => guildDocument.data.features.server.features?.suggestions,
	verification: (guildDocument) => guildDocument.data.features.moderation.features?.verification,
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
	DataType extends BaseDocumentProperties,
	Metadata extends Record<string, unknown> & { userId: bigint; reference: string },
	InteractionData extends [...InteractionDataBase, ...string[]],
> extends LocalService {
	private readonly type: PromptType;
	private readonly customId: string;

	private readonly handlers: Map<
		string,
		(bot: Discord.Bot, interaction: Discord.Interaction, data: InteractionData) => void
	> = new Map();

	private readonly prompts: Map</*reference: */ string, Discord.Message> = new Map();

	private readonly documents: Document<DataType>[];
	private readonly documentsByPromptId: Map</*promptId: */ bigint, Document<DataType>> = new Map();
	private readonly userIds: Map</*promptId: */ bigint, bigint> = new Map();

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

	constructor(client: Client, guildId: bigint, { type }: { type: PromptType }) {
		super(client, guildId);
		this.type = type;
		this.customId = customIds[type];
		this.documents = this.getAllDocuments();
		this._configuration = configurationLocators[type];
	}

	async start(bot: Discord.Bot): Promise<void> {
		const [channelId, configuration, guild, guildDocument] = [
			this.channelId,
			this.configuration,
			this.guild,
			this.guildDocument,
		];
		if (channelId === undefined || configuration === undefined || guild === undefined || guildDocument === undefined) {
			return;
		}

		this.client.log.info(`Registering ${this.type} prompts on ${guild.name} (${guild.id})...`);

		const promptsAll = (await getAllMessages([this.client, bot], channelId)) ?? [];
		const [valid, invalid] = this.filterPrompts(promptsAll);

		const prompts = this.sortPrompts(valid);

		for (const document of this.documents) {
			const userDocument = await this.getUserDocument(document);
			if (userDocument === undefined) {
				continue;
			}

			const userId = BigInt(userDocument.data.account.id);
			const reference = stringifyValue(document.ref);

			let prompt = prompts.get(userId)?.get(reference);
			if (prompt !== undefined) {
				prompts.get(userId)?.delete(reference);
			} else {
				const user = this.client.cache.users.get(userId);
				if (user === undefined) {
					continue;
				}

				const message = await this.savePrompt(bot, user, document);
				if (message === undefined) {
					continue;
				}

				prompt = message;
			}

			this.registerPrompt(prompt, userId, reference, document);
			this.registerHandler([userId.toString(), this.guildIdString, reference]);
		}

		const expired = Array.from(prompts.values()).flatMap((map) => Array.from(map.values()));

		for (const prompt of [...invalid, ...expired]) {
			await Discord.deleteMessage(bot, prompt.channelId, prompt.id).catch(() => {
				this.client.log.warn("Failed to delete prompt.");
			});
		}

		createInteractionCollector([this.client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			customId: this.customId,
			doesNotExpire: true,
			onCollect: async (bot, selection) => {
				const customId = selection.data?.customId;
				if (customId === undefined) {
					return;
				}

				const [_, userId, __, reference, ...metadata] = decodeId<InteractionData>(customId);

				const handle = this.handlers.get([userId, this.guildId, reference].join(constants.symbols.meta.idSeparator));
				if (handle === undefined) {
					return;
				}

				handle(bot, selection, [userId, this.guildIdString, reference, ...metadata] as InteractionData);
			},
		});
	}

	// Anti-tampering feature; detects prompts being deleted.
	async messageDelete(bot: Discord.Bot, message: Discord.Message): Promise<void> {
		// If the message was deleted from a channel not managed by this prompt manager.
		if (message.channelId !== this.channelId) {
			return;
		}

		const document = this.documentsByPromptId.get(message.id);
		if (document === undefined) {
			return;
		}

		const userId = this.userIds.get(message.id);
		if (userId === undefined) {
			return;
		}

		const user = this.client.cache.users.get(userId);
		if (user === undefined) {
			return;
		}

		const reference = stringifyValue(document.ref);

		const prompt = await this.savePrompt(bot, user, document);
		if (prompt === undefined) {
			return;
		}

		this.registerPrompt(prompt, userId, reference, document);

		this.documentsByPromptId.delete(message.id);
		this.userIds.delete(message.id);
	}

	async messageUpdate(bot: Discord.Bot, message: Discord.Message): Promise<void> {
		// If the message was updated in a channel not managed by this prompt manager.
		if (message.channelId !== this.channelId) {
			return;
		}

		// If the embed is still present, it wasn't an embed having been deleted. Do not do anything.
		if (message.embeds.length === 1) {
			return;
		}

		// Delete the message and allow the bot to handle the deletion.
		Discord.deleteMessage(bot, message.channelId, message.id).catch(() =>
			this.client.log.warn(
				`Failed to delete prompt with ID ${message.id} from channel with ID ${message.channelId} on guild with ID ${message.guildId}.`,
			),
		);
	}

	abstract getAllDocuments(): Document<DataType>[];
	abstract getUserDocument(document: Document<DataType>): Promise<Document<User> | undefined>;

	abstract decodeMetadata(data: string[]): Metadata | undefined;

	abstract getPromptContent(
		bot: Discord.Bot,
		user: Discord.User,
		document: Document<DataType>,
	): Discord.CreateMessage | undefined;

	getMetadata(prompt: Discord.Message): string[] | undefined {
		const metadata = prompt.embeds.at(-1)?.footer?.iconUrl?.split("&metadata=").at(-1);
		if (metadata === undefined) {
			return undefined;
		}

		const data = metadata.split(constants.symbols.meta.metadataSeparator);
		return data;
	}

	filterPrompts(prompts: Discord.Message[]): [valid: [Discord.Message, Metadata][], invalid: Discord.Message[]] {
		const valid: [Discord.Message, Metadata][] = [];
		const invalid: Discord.Message[] = [];
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

	sortPrompts(
		prompts: [Discord.Message, Metadata][],
	): Map</*userId: */ bigint, Map</*reference: */ string, Discord.Message>> {
		const promptsSorted = new Map<bigint, Map<string, Discord.Message>>();

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
		bot: Discord.Bot,
		user: Discord.User,
		document: Document<DataType>,
	): Promise<Discord.Message | undefined> {
		const channelId = this.channelId;
		if (channelId === undefined) {
			return undefined;
		}

		const content = this.getPromptContent(bot, user, document);
		if (content === undefined) {
			return undefined;
		}

		const message = await Discord.sendMessage(bot, channelId, content).catch(() => {
			this.client.log.warn(`Failed to send message in channel with ID ${channelId}.`);
			return undefined;
		});
		return message;
	}

	registerPrompt(prompt: Discord.Message, userId: bigint, reference: string, document: Document<DataType>): void {
		this.documentsByPromptId.set(prompt.id, document);
		this.userIds.set(prompt.id, userId);
		this.prompts.set(reference, prompt);
	}

	unregisterPrompt(prompt: Discord.Message, reference: string): void {
		this.documentsByPromptId.delete(prompt.id);
		this.userIds.delete(prompt.id);
		this.prompts.delete(reference);
	}

	registerHandler(data: InteractionDataBase): void {
		this.handlers.set(data.join(constants.symbols.meta.idSeparator), async (bot, interaction) => {
			const customId = interaction.data?.customId;
			if (customId === undefined) {
				return;
			}

			const [_, userId, guildId, reference, ...metadata] = decodeId<InteractionData>(customId);

			const updatedDocument = await this.handleInteraction(bot, interaction, [
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
				this.documentsByPromptId.set(prompt.id, updatedDocument);
			}

			Discord.deleteMessage(bot, prompt.channelId, prompt.id).catch(() => {
				this.client.log.warn("Failed to delete prompt.");
			});
		});
	}

	abstract handleInteraction(
		bot: Discord.Bot,
		interaction: Discord.Interaction,
		data: InteractionData,
	): Promise<Document<DataType> | undefined | null>;
}

export { PromptService, Configurations };
