import type { Client } from "logos/client";
import { Collector, InteractionCollector } from "logos/collectors";
import type { Guild } from "logos/models/guild";
import type { Model } from "logos/models/model";
import type { User } from "logos/models/user";
import { LocalService } from "logos/services/service";
import type { ServiceStore } from "logos/stores/services";

interface Configurations {
	verification: Guild["verification"];
	reports: Guild["reports"];
	resources: Guild["resourceSubmissions"];
	suggestions: Guild["suggestions"];
	tickets: Guild["tickets"];
}

type ConfigurationLocators = {
	[K in keyof Configurations]: (guildDocument: Guild) => Configurations[K] | undefined;
};

type CustomIDs = Record<keyof Configurations, string>;

type PromptType = keyof ServiceStore["local"]["prompts"];

type PromptDeleteMode = "delete" | "close" | "none";

interface ExistingPrompts {
	readonly valid: [partialId: string, prompt: Discord.Message][];
	readonly invalid: Discord.Message[];
	readonly noPromptsMessageExists: boolean;
}

abstract class PromptService<
	Generic extends {
		type: PromptType;
		model: Model;
		metadata: [partialId: string, ...data: string[]];
	} = {
		type: PromptType;
		model: Model;
		metadata: [partialId: string, isResolve: string];
	},
> extends LocalService {
	static readonly #configurationLocators = Object.freeze({
		verification: (guildDocument) => guildDocument.verification,
		reports: (guildDocument) => guildDocument.reports,
		resources: (guildDocument) => guildDocument.resourceSubmissions,
		suggestions: (guildDocument) => guildDocument.suggestions,
		tickets: (guildDocument) => guildDocument.tickets,
	} as const satisfies ConfigurationLocators);
	static readonly #customIds = Object.freeze({
		verification: constants.components.verification,
		reports: constants.components.reports,
		resources: constants.components.resources,
		suggestions: constants.components.suggestions,
		tickets: constants.components.tickets,
	} as const satisfies CustomIDs);

	readonly documents: Map<string, Generic["model"]>;
	readonly promptByPartialId: Map</*partialId: */ string, Discord.Message>;
	readonly magicButton: InteractionCollector<Generic["metadata"]>;
	readonly removeButton: InteractionCollector<[partialId: string]>;

	readonly #type: Generic["type"];
	readonly #deleteMode: PromptDeleteMode;
	readonly #handlerByPartialId: Map<
		/*partialId: */ string,
		(interaction: Logos.Interaction<Generic["metadata"]>) => void
	>;
	readonly #documentByPromptId: Map</*promptId: */ bigint, Generic["model"]>;
	readonly #userIdByPromptId: Map</*promptId: */ bigint, bigint>;
	readonly #configuration: ConfigurationLocators[Generic["type"]];
	readonly #messageUpdates: Collector<"messageUpdate">;
	readonly #messageDeletes: Collector<"messageDelete">;

	get configuration(): NonNullable<Configurations[Generic["type"]]> {
		return this.#configuration(this.guildDocument)!;
	}

	get channelId(): bigint {
		return BigInt(this.configuration.channelId);
	}

	constructor(
		client: Client,
		{ identifier, guildId }: { identifier: string; guildId: bigint },
		{ type, deleteMode }: { type: Generic["type"]; deleteMode: PromptDeleteMode },
	) {
		super(client, { identifier, guildId });

		const customId = PromptService.#customIds[type];
		this.magicButton = new InteractionCollector(client, { customId, isPermanent: true });
		this.removeButton = new InteractionCollector(client, {
			guildId,
			customId: InteractionCollector.encodeCustomId([constants.components.removePrompt, customId]),
			isPermanent: true,
		});

		this.documents = new Map();
		this.promptByPartialId = new Map();

		this.#type = type;
		this.#deleteMode = deleteMode;
		this.#handlerByPartialId = new Map();
		this.#documentByPromptId = new Map();
		this.#userIdByPromptId = new Map();
		this.#configuration = PromptService.#configurationLocators[type];
		this.#messageUpdates = new Collector<"messageUpdate">({ guildId });
		this.#messageDeletes = new Collector<"messageDelete">({ guildId });
	}

	static encodeMetadataInUserAvatar({ user, partialId }: { user: Logos.User; partialId: string }): string {
		const iconUrl = Discord.avatarUrl(user.id, user.discriminator, {
			avatar: user.avatar,
			size: 64,
			format: "png",
		});

		return `${iconUrl}&metadata=${partialId}`;
	}

	static encodeMetadataInGuildIcon({ guild, partialId }: { guild: Logos.Guild; partialId: string }): string {
		const iconUrl = Discord.guildIconUrl(guild.id, guild.icon);

		return `${iconUrl}&metadata=${partialId}`;
	}

	async start(): Promise<void> {
		this.#restoreDocuments();

		const existingPrompts = await this.#getExistingPrompts();
		const expiredPrompts = await this.#restoreValidPrompts(existingPrompts.valid);
		await this.#deleteInvalidPrompts([...existingPrompts.invalid, ...expiredPrompts.values()]);

		if (!existingPrompts.noPromptsMessageExists) {
			await this.#tryPostNoPromptsMessage();
		}

		this.#messageUpdates.onCollect(this.#handleMessageUpdate.bind(this));
		this.#messageDeletes.onCollect(this.#handleMessageDelete.bind(this));
		this.magicButton.onInteraction(this.#handleMagicButtonPress.bind(this));
		this.removeButton.onInteraction(this.#handlePromptRemove.bind(this));

		await this.client.registerCollector("messageUpdate", this.#messageUpdates);
		await this.client.registerCollector("messageDelete", this.#messageDeletes);
		await this.client.registerInteractionCollector(this.magicButton);
		await this.client.registerInteractionCollector(this.removeButton);
	}

	async stop(): Promise<void> {
		await this.#messageUpdates.close();
		await this.#messageDeletes.close();
		await this.magicButton.close();
		await this.removeButton.close();

		this.documents.clear();
		this.promptByPartialId.clear();

		this.#handlerByPartialId.clear();
		this.#documentByPromptId.clear();
		this.#userIdByPromptId.clear();
	}

	#restoreDocuments(): void {
		const documents = this.getAllDocuments();

		this.log.info(
			`Found ${documents.size} ${this.#type} documents on ${this.client.diagnostics.guild(this.guild)}.`,
		);

		for (const [partialId, document] of documents.entries()) {
			this.documents.set(partialId, document);
		}
	}

	async #getExistingPrompts(): Promise<ExistingPrompts> {
		const channelId = this.channelId!;
		const messages = (await this.getAllMessages({ channelId })) ?? [];

		const valid: [partialId: string, prompt: Discord.Message][] = [];
		const invalid: Discord.Message[] = [];
		let noPromptsMessageExists = false;

		for (const prompt of messages) {
			const metadata = this.getMetadata(prompt);
			if (metadata === undefined) {
				invalid.push(prompt);
				continue;
			}

			if (metadata === constants.components.noPrompts) {
				if (noPromptsMessageExists) {
					invalid.push(prompt);
					continue;
				}

				noPromptsMessageExists = true;
				continue;
			}

			valid.push([metadata, prompt]);
		}

		this.log.info(`Found ${messages.length} messages in ${this.client.diagnostics.channel(channelId)}.`);

		if (invalid.length > 0) {
			this.log.warn(
				`${invalid.length} messages in ${this.client.diagnostics.channel(channelId)} aren't prompts or are invalid.`,
			);
		}

		return { valid, invalid, noPromptsMessageExists };
	}

	async #restoreValidPrompts(
		prompts: [partialId: string, prompt: Discord.Message][],
	): Promise<Map<string, Discord.Message>> {
		if (prompts.length === 0) {
			return new Map();
		}

		this.log.info(`Restoring state for ${prompts.length} ${this.#type} documents...`);

		const remainingPrompts = new Map(prompts);
		for (const [_, document] of this.documents) {
			const userDocument = await this.getUserDocument(document);
			const userId = BigInt(userDocument.userId);

			let prompt = remainingPrompts.get(document.partialId);
			if (prompt !== undefined) {
				remainingPrompts.delete(document.partialId);
			} else {
				this.log.warn(
					`Could not find existing prompt for ${document.id}. Has it been manually deleted? Recreating...`,
				);

				const user = this.client.entities.users.get(userId);
				if (user === undefined) {
					this.log.info(`Could not find the author object of ${document.id}. Skipping...`);
					continue;
				}

				const message = await this.savePrompt(user, document);
				if (message === undefined) {
					this.log.info(`Could not create prompt for ${document.id}. Skipping...`);
					continue;
				}

				prompt = message;
			}

			this.registerPrompt(prompt, userId, document);
			this.registerDocument(document);
			this.registerHandler(document);
		}

		if (remainingPrompts.size > 0) {
			this.log.warn(`Could not restore the prompt-to-document link between ${remainingPrompts.size} prompts.`);
		}

		return remainingPrompts;
	}

	async #deleteInvalidPrompts(prompts: Discord.Message[]): Promise<void> {
		if (prompts.length === 0) {
			return;
		}

		this.log.warn(`Deleting ${prompts.length} invalid or expired prompts...`);

		for (const prompt of prompts) {
			await this.client.bot.helpers.deleteMessage(prompt.channelId, prompt.id).catch((reason) => {
				this.log.warn("Failed to delete invalid or expired prompt:", reason);
			});
		}
	}

	// Anti-tampering feature; detects prompts being changed from the outside (embeds being deleted).
	async #handleMessageUpdate(message: Discord.Message): Promise<void> {
		// If the message was updated in a channel not managed by this prompt manager.
		if (message.channelId !== this.channelId) {
			return;
		}

		// If the embed is still present, it wasn't an embed having been deleted. Do not do anything.
		if (message.embeds?.length === 1) {
			return;
		}

		// Delete the message and allow the bot to handle the deletion.
		this.client.bot.helpers
			.deleteMessage(message.channelId, message.id)
			.catch(() =>
				this.log.warn(
					`Failed to delete prompt ${this.client.diagnostics.message(
						message,
					)} from ${this.client.diagnostics.channel(message.channelId)} on ${this.client.diagnostics.guild(
						message.guildId ?? 0n,
					)}.`,
				),
			);
	}

	// Anti-tampering feature; detects prompts being deleted.
	async #handleMessageDelete({ id, channelId }: { id: bigint; channelId: bigint }): Promise<void> {
		// If the message was deleted from a channel not managed by this prompt manager.
		if (channelId !== this.channelId) {
			return;
		}

		await this.#tryPostNoPromptsMessage();

		const promptDocument = this.#documentByPromptId.get(id);
		if (promptDocument === undefined) {
			return;
		}

		const userId = this.#userIdByPromptId.get(id);
		if (userId === undefined) {
			return;
		}

		const user = this.client.entities.users.get(userId);
		if (user === undefined) {
			return;
		}

		const prompt = await this.savePrompt(user, promptDocument);
		if (prompt === undefined) {
			return;
		}

		const partialId = this.getMetadata(prompt);
		if (partialId === undefined) {
			return;
		}

		this.registerPrompt(prompt, userId, promptDocument);

		this.#documentByPromptId.delete(id);
		this.#userIdByPromptId.delete(id);
	}

	#handleMagicButtonPress(buttonPress: Logos.Interaction<Generic["metadata"], any>): void {
		const handle = this.#handlerByPartialId.get(buttonPress.metadata[1]);
		if (handle === undefined) {
			return;
		}

		handle(buttonPress);
	}

	async #handlePromptRemove(buttonPress: Logos.Interaction): Promise<void> {
		const customId = buttonPress.data?.customId;
		if (customId === undefined) {
			return;
		}

		const guildId = buttonPress.guildId;
		if (guildId === undefined) {
			return;
		}

		const member = buttonPress.member;
		if (member === undefined) {
			return;
		}

		let management: { roles?: string[]; users?: string[] } | undefined;
		switch (this.#type) {
			case "verification": {
				management = (this.configuration as Guild["verification"])?.management;
				break;
			}
			case "reports": {
				management = (this.configuration as Guild["reports"])?.management;
				break;
			}
			case "resources": {
				management = (this.configuration as Guild["resourceSubmissions"])?.management;
				break;
			}
			case "suggestions": {
				management = (this.configuration as Guild["suggestions"])?.management;
				break;
			}
			case "tickets": {
				management = (this.configuration as Guild["tickets"])?.management;
				break;
			}
			default: {
				management = undefined;
				break;
			}
		}

		const roleIds = management?.roles?.map((roleId) => BigInt(roleId));
		const userIds = management?.users?.map((userId) => BigInt(userId));

		const isAuthorised =
			member.roles.some((roleId) => roleIds?.includes(roleId) ?? false) ||
			(userIds?.includes(buttonPress.user.id) ?? false);
		if (!isAuthorised) {
			if (this.#deleteMode === "delete") {
				const strings = constants.contexts.cannotRemovePrompt({
					localise: this.client.localise.bind(this.client),
					locale: buttonPress.locale,
				});
				await this.client.warning(buttonPress, {
					title: strings.title,
					description: strings.description,
				});
				return;
			}

			if (this.#deleteMode === "close") {
				const strings = constants.contexts.cannotCloseIssue({
					localise: this.client.localise.bind(this.client),
					locale: buttonPress.locale,
				});
				await this.client.warning(buttonPress, {
					title: strings.title,
					description: strings.description,
				});
				return;
			}

			return;
		}

		await this.client.acknowledge(buttonPress);

		const prompt = this.promptByPartialId.get(buttonPress.metadata[1]);
		if (prompt === undefined) {
			return;
		}

		const promptDocument = this.#documentByPromptId.get(prompt.id);
		if (promptDocument === undefined) {
			return;
		}

		await this.handleDelete(promptDocument);
	}

	abstract getAllDocuments(): Map<string, Generic["model"]>;
	abstract getUserDocument(promptDocument: Generic["model"]): Promise<User>;
	abstract getPromptContent(
		user: Logos.User,
		promptDocument: Generic["model"],
	): Discord.CreateMessageOptions | undefined;
	abstract getNoPromptsMessageContent(): Discord.CreateMessageOptions;

	async #tryPostNoPromptsMessage(): Promise<Discord.Message | undefined> {
		if (this.#documentByPromptId.size > 0) {
			return;
		}

		return await this.client.bot.helpers
			.sendMessage(this.channelId, this.getNoPromptsMessageContent())
			.catch((reason) => {
				this.log.warn(
					`Failed to send message to ${this.client.diagnostics.channel(this.channelId)}: ${reason}`,
				);

				return undefined;
			});
	}

	getMetadata(prompt: Discord.Message): string | undefined {
		return prompt.embeds?.at(-1)?.footer?.iconUrl?.split("&metadata=").at(-1);
	}

	async savePrompt(user: Logos.User, promptDocument: Generic["model"]): Promise<Discord.Message | undefined> {
		const content = this.getPromptContent(user, promptDocument);
		if (content === undefined) {
			return undefined;
		}

		const prompt = await this.client.bot.helpers.sendMessage(this.channelId, content).catch((reason) => {
			this.log.warn(`Failed to send message to ${this.client.diagnostics.channel(this.channelId)}: ${reason}`);

			return undefined;
		});
		if (prompt === undefined) {
			return undefined;
		}

		this.registerDocument(promptDocument);
		this.registerPrompt(prompt, user.id, promptDocument);
		this.registerHandler(promptDocument);

		return prompt;
	}

	registerDocument(promptDocument: Generic["model"]): void {
		this.documents.set(promptDocument.partialId, promptDocument);
	}

	unregisterDocument(promptDocument: Generic["model"]): void {
		this.documents.delete(promptDocument.partialId);
	}

	registerPrompt(prompt: Discord.Message, userId: bigint, promptDocument: Generic["model"]): void {
		this.promptByPartialId.set(promptDocument.partialId, prompt);

		this.#documentByPromptId.set(prompt.id, promptDocument);
		this.#userIdByPromptId.set(prompt.id, userId);
	}

	unregisterPrompt(prompt: Discord.Message, promptDocument: Generic["model"]): void {
		this.promptByPartialId.delete(promptDocument.partialId);

		this.#documentByPromptId.delete(prompt.id);
		this.#userIdByPromptId.delete(prompt.id);
	}

	registerHandler(promptDocument: Generic["model"]): void {
		this.#handlerByPartialId.set(promptDocument.partialId, async (interaction) => {
			const updatedDocument = await this.handlePromptInteraction(interaction);
			if (updatedDocument === undefined) {
				return;
			}

			const prompt = this.promptByPartialId.get(interaction.metadata[1]);
			if (prompt === undefined) {
				return;
			}

			if (updatedDocument === null) {
				this.unregisterDocument(promptDocument);
				this.unregisterPrompt(prompt, promptDocument);
				this.unregisterHandler(promptDocument);
			} else {
				this.#documentByPromptId.set(prompt.id, updatedDocument);
			}

			this.client.bot.helpers
				.deleteMessage(prompt.channelId, prompt.id)
				.catch(() => this.log.warn("Failed to delete prompt."));
		});
	}

	unregisterHandler(promptDocument: Generic["model"]): void {
		this.#handlerByPartialId.delete(promptDocument.partialId);
	}

	abstract handlePromptInteraction(
		interaction: Logos.Interaction<Generic["metadata"]>,
	): Promise<Generic["model"] | undefined | null>;

	async handleDelete(promptDocument: Generic["model"]): Promise<void> {
		await promptDocument.delete(this.client);

		const prompt = this.promptByPartialId.get(promptDocument.partialId);
		if (prompt !== undefined) {
			this.client.bot.helpers
				.deleteMessage(prompt.channelId, prompt.id)
				.catch(() => this.log.warn("Failed to delete prompt after deleting document."));
			this.unregisterPrompt(prompt, promptDocument);
		}

		this.unregisterDocument(promptDocument);
		this.unregisterHandler(promptDocument);
	}
}

export { PromptService };
