import constants from "../../../constants/constants";
import { Client, InteractionCollector, ServiceStore } from "../../client";
import { Guild } from "../../database/guild";
import { Model } from "../../database/model";
import { User } from "../../database/user";
import diagnostics from "../../diagnostics";
import { getAllMessages } from "../../utils";
import { LocalService } from "../service";

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

const configurationLocators: ConfigurationLocators = {
	verification: (guildDocument) => guildDocument.verification,
	reports: (guildDocument) => guildDocument.reports,
	resources: (guildDocument) => guildDocument.resourceSubmissions,
	suggestions: (guildDocument) => guildDocument.suggestions,
	tickets: (guildDocument) => guildDocument.tickets,
};

type CustomIDs = Record<keyof Configurations, string>;

const customIds: CustomIDs = {
	verification: constants.components.verification,
	reports: constants.components.reports,
	resources: constants.components.resources,
	suggestions: constants.components.suggestions,
	tickets: constants.components.tickets,
};

type PromptType = keyof ServiceStore["local"]["prompts"];

type PromptDeleteMode = "delete" | "close" | "none";

// TODO(vxern): Use hashing and registering old prompts.
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
	readonly magicButton: InteractionCollector<Generic["metadata"]>;
	readonly removeButton: InteractionCollector<[partialId: string]>;

	// TODO(vxern): These were protected.
	readonly documents: Map<string, Generic["model"]>;
	readonly promptByPartialId: Map</*partialId: */ string, Discord.CamelizedDiscordMessage>;

	readonly #type: Generic["type"];
	readonly #deleteMode: PromptDeleteMode;

	readonly #handlerByPartialId: Map<
		/*partialId: */ string,
		(interaction: Logos.Interaction<Generic["metadata"]>) => void
	>;
	readonly #documentByPromptId: Map</*promptId: */ string, Generic["model"]>;
	readonly #userIdByPromptId: Map</*promptId: */ string, bigint>;

	readonly #_configuration: ConfigurationLocators[Generic["type"]];

	get configuration(): Configurations[Generic["type"]] | undefined {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return undefined;
		}

		return this.#_configuration(guildDocument);
	}

	get channelId(): bigint | undefined {
		const configuration = this.configuration;
		if (configuration === undefined) {
			return undefined;
		}

		if (configuration.channelId === undefined) {
			return undefined;
		}

		const channelId = BigInt(configuration.channelId);
		if (channelId === undefined) {
			return undefined;
		}

		return channelId;
	}

	constructor(
		client: Client,
		{ identifier, guildId }: { identifier: string; guildId: bigint },
		{ type, deleteMode }: { type: Generic["type"]; deleteMode: PromptDeleteMode },
	) {
		super(client, { identifier, guildId });

		const customId = customIds[type];

		this.magicButton = new InteractionCollector(client, { customId, isPermanent: true });
		this.removeButton = new InteractionCollector(client, {
			customId: InteractionCollector.encodeCustomId([
				constants.components.removePrompt,
				customId,
				this.guildId.toString(),
			]),
			isPermanent: true,
		});

		this.#type = type;
		this.#deleteMode = deleteMode;

		this.documents = this.getAllDocuments();
		this.promptByPartialId = new Map();

		this.#handlerByPartialId = new Map();
		this.#documentByPromptId = new Map();
		this.#userIdByPromptId = new Map();

		this.#_configuration = configurationLocators[type];
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

		const promptsAll = (await getAllMessages(this.client, channelId)) ?? [];
		const [validPrompts, invalidPrompts] = this.filterPrompts(promptsAll);

		const prompts = new Map(validPrompts);

		for (const [_, promptDocument] of this.documents) {
			const userDocument = await this.getUserDocument(promptDocument);

			const userId = BigInt(userDocument.account.id);

			let prompt = prompts.get(promptDocument.partialId);
			if (prompt !== undefined) {
				prompts.delete(promptDocument.partialId);
			} else {
				const user = this.client.entities.users.get(userId);
				if (user === undefined) {
					continue;
				}

				const message = await this.savePrompt(user, promptDocument);
				if (message === undefined) {
					continue;
				}

				prompt = message;
			}

			this.registerPrompt(prompt, userId, promptDocument);
			this.registerDocument(promptDocument);
			this.registerHandler(promptDocument);
		}

		const expiredPrompts = Array.from(prompts.values());

		for (const prompt of [...invalidPrompts, ...expiredPrompts]) {
			await this.client.bot.rest.deleteMessage(prompt.channelId, prompt.id).catch(() => {
				this.log.warn("Failed to delete invalid or expired prompt.");
			});
		}

		this.magicButton.onCollect(async (buttonPress) => {
			const handle = this.#handlerByPartialId.get(buttonPress.metadata[1]);
			if (handle === undefined) {
				return;
			}

			handle(buttonPress);
		});

		this.removeButton.onCollect(async (buttonPress) => {
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
					management = (configuration as Configurations["verification"])?.management;
					break;
				}
				case "reports": {
					management = (configuration as Configurations["reports"])?.management;
					break;
				}
				case "resources": {
					management = (configuration as Configurations["resources"])?.management;
					break;
				}
				case "suggestions": {
					management = (configuration as Configurations["suggestions"])?.management;
					break;
				}
				case "tickets": {
					management = (configuration as Configurations["tickets"])?.management;
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
				const locale = buttonPress.locale;

				if (this.#deleteMode === "delete") {
					const strings = {
						title: this.client.localise("cannotRemovePrompt.title", locale)(),
						description: this.client.localise("cannotRemovePrompt.description", locale)(),
					};

					this.client.reply(buttonPress, {
						embeds: [
							{
								title: strings.title,
								description: strings.description,
								color: constants.colors.peach,
							},
						],
					});
				} else if (this.#deleteMode === "close") {
					const strings = {
						title: this.client.localise("cannotCloseIssue.title", locale)(),
						description: this.client.localise("cannotCloseIssue.description", locale)(),
					};

					this.client.reply(buttonPress, {
						embeds: [
							{
								title: strings.title,
								description: strings.description,
								color: constants.colors.peach,
							},
						],
					});
				}

				return;
			}

			this.client.acknowledge(buttonPress);

			const prompt = this.promptByPartialId.get(buttonPress.metadata[1]);
			if (prompt === undefined) {
				return;
			}

			const promptDocument = this.#documentByPromptId.get(prompt.id);
			if (promptDocument === undefined) {
				return;
			}

			this.handleDelete(promptDocument);
		});

		this.client.registerInteractionCollector(this.magicButton);
		this.client.registerInteractionCollector(this.removeButton);
	}

	async stop(): Promise<void> {
		await this.magicButton.close();
		await this.removeButton.close();

		this.documents.clear();
		this.promptByPartialId.clear();

		this.#handlerByPartialId.clear();
		this.#documentByPromptId.clear();
		this.#userIdByPromptId.clear();
	}

	// Anti-tampering feature; detects prompts being deleted.
	async messageDelete(message: Discord.Message): Promise<void> {
		// If the message was deleted from a channel not managed by this prompt manager.
		if (message.channelId !== this.channelId) {
			return;
		}

		const promptDocument = this.#documentByPromptId.get(message.id.toString());
		if (promptDocument === undefined) {
			return;
		}

		const userId = this.#userIdByPromptId.get(message.id.toString());
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

		const partialId = this.extractPartialId(prompt);
		if (partialId === undefined) {
			return;
		}

		this.registerPrompt(prompt, userId, promptDocument);

		this.#documentByPromptId.delete(message.id.toString());
		this.#userIdByPromptId.delete(message.id.toString());
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
		this.client.bot.rest
			.deleteMessage(message.channelId, message.id)
			.catch(() =>
				this.log.warn(
					`Failed to delete prompt ${diagnostics.display.message(message)} from ${diagnostics.display.channel(
						message.channelId,
					)} on ${diagnostics.display.guild(message.guildId ?? 0n)}.`,
				),
			);
	}

	abstract getAllDocuments(): Map<string, Generic["model"]>;
	abstract getUserDocument(promptDocument: Generic["model"]): Promise<User>;

	abstract getPromptContent(
		user: Logos.User,
		promptDocument: Generic["model"],
	): Discord.CreateMessageOptions | undefined;

	extractPartialId(prompt: Discord.CamelizedDiscordMessage): string | undefined {
		const partialId = prompt.embeds?.at(-1)?.footer?.iconUrl?.split("&metadata=").at(-1);
		if (partialId === undefined) {
			return undefined;
		}

		return partialId;
	}

	filterPrompts(
		prompts: Discord.CamelizedDiscordMessage[],
	): [
		valid: [partialId: string, prompt: Discord.CamelizedDiscordMessage][],
		invalid: Discord.CamelizedDiscordMessage[],
	] {
		const valid: [partialId: string, prompt: Discord.CamelizedDiscordMessage][] = [];
		const invalid: Discord.CamelizedDiscordMessage[] = [];

		for (const prompt of prompts) {
			const partialId = this.extractPartialId(prompt);
			if (partialId === undefined) {
				invalid.push(prompt);
				continue;
			}

			valid.push([partialId, prompt]);
		}

		return [valid, invalid];
	}

	async savePrompt(
		user: Logos.User,
		promptDocument: Generic["model"],
	): Promise<Discord.CamelizedDiscordMessage | undefined> {
		const channelId = this.channelId;
		if (channelId === undefined) {
			return undefined;
		}

		const content = this.getPromptContent(user, promptDocument);
		if (content === undefined) {
			return undefined;
		}

		const message = await this.client.bot.rest.sendMessage(channelId, content).catch(() => {
			this.log.warn(`Failed to send message to ${diagnostics.display.channel(channelId)}.`);
			return undefined;
		});

		return message;
	}

	registerDocument(promptDocument: Generic["model"]): void {
		this.documents.set(promptDocument.partialId, promptDocument);
	}

	unregisterDocument(promptDocument: Generic["model"]): void {
		this.documents.delete(promptDocument.partialId);
	}

	registerPrompt(prompt: Discord.CamelizedDiscordMessage, userId: bigint, promptDocument: Generic["model"]): void {
		this.promptByPartialId.set(promptDocument.partialId, prompt);

		this.#documentByPromptId.set(prompt.id, promptDocument);
		this.#userIdByPromptId.set(prompt.id, userId);
	}

	unregisterPrompt(prompt: Discord.CamelizedDiscordMessage, promptDocument: Generic["model"]): void {
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

			this.client.bot.rest
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
			this.client.bot.rest
				.deleteMessage(prompt.channelId, prompt.id)
				.catch(() => this.log.warn("Failed to delete prompt after deleting document."));
			this.unregisterPrompt(prompt, promptDocument);
		}

		this.unregisterDocument(promptDocument);
		this.unregisterHandler(promptDocument);
	}
}

export { PromptService, Configurations };
