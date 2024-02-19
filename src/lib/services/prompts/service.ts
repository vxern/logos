import * as Discord from "@discordeno/bot";
import constants from "../../../constants/constants";
import * as Logos from "../../../types";
import { Client, InteractionCollector, ServiceStore } from "../../client";
import { Guild } from "../../database/guild";
import { Model } from "../../database/model";
import { User } from "../../database/user";
import diagnostics from "../../diagnostics";
import { decodeId, getLocaleData } from "../../interactions";
import { getAllMessages } from "../../utils";
import { LocalService } from "../service";

interface Configurations {
	verification: NonNullable<Guild["features"]["moderation"]["features"]>["verification"];
	reports: NonNullable<Guild["features"]["moderation"]["features"]>["reports"];
	resources: NonNullable<Guild["features"]["server"]["features"]>["resources"];
	suggestions: NonNullable<Guild["features"]["server"]["features"]>["suggestions"];
	tickets: NonNullable<Guild["features"]["server"]["features"]>["tickets"];
}

type ConfigurationLocators = {
	[K in keyof Configurations]: (guildDocument: Guild) => Configurations[K] | undefined;
};

const configurationLocators: ConfigurationLocators = {
	verification: (guildDocument) => guildDocument.features.moderation.features?.verification,
	reports: (guildDocument) => guildDocument.features.moderation.features?.reports,
	resources: (guildDocument) => guildDocument.features.server.features?.resources,
	suggestions: (guildDocument) => guildDocument.features.server.features?.suggestions,
	tickets: (guildDocument) => guildDocument.features.server.features?.tickets,
};

type CustomIDs = Record<keyof Configurations, string>;

const customIds: CustomIDs = {
	verification: constants.components.verification,
	reports: constants.components.reports,
	resources: constants.components.resources,
	suggestions: constants.components.suggestions,
	tickets: constants.components.tickets,
};

type PromptTypes = keyof ServiceStore["local"]["prompts"];

type DeleteMode = "delete" | "close" | "none";

// TODO(vxern): Use hashing and registering old prompts.
abstract class PromptService<
	PromptType extends PromptTypes,
	M extends Model<any>,
	InteractionData extends [partialId: string, ...data: string[]],
> extends LocalService {
	private readonly type: PromptType;
	private readonly customId: string;
	private readonly deleteMode: DeleteMode;

	protected readonly documents: Map<string, M>;

	private readonly handlerByPartialId: Map<
		/*partialId: */ string,
		(interaction: Logos.Interaction, data: InteractionData) => void
	>;
	protected readonly promptByPartialId: Map</*partialId: */ string, Discord.CamelizedDiscordMessage>;
	private readonly documentByPromptId: Map</*promptId: */ string, M>;
	private readonly userIdByPromptId: Map</*promptId: */ string, bigint>;

	private readonly _configuration: ConfigurationLocators[PromptType];

	readonly #_magicButton: InteractionCollector;
	readonly #_removeButton?: InteractionCollector;

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

	constructor(client: Client, guildId: bigint, { type, deleteMode }: { type: PromptType; deleteMode: DeleteMode }) {
		super(client, guildId);
		this.type = type;
		this.deleteMode = deleteMode;
		this.customId = customIds[type];

		this.documents = this.getAllDocuments();

		this.handlerByPartialId = new Map();
		this.promptByPartialId = new Map();
		this.documentByPromptId = new Map();
		this.userIdByPromptId = new Map();

		this._configuration = configurationLocators[type];

		this.#_magicButton = new InteractionCollector(client, { customId: this.customId, isPermanent: true });
		this.#_removeButton =
			this.deleteMode !== undefined
				? new InteractionCollector(client, {
						// TODO(vxern): Better ID.
						customId: `${constants.components.removePrompt}/${this.customId}/${this.guildId}`,
						isPermanent: true,
				  })
				: undefined;
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
				this.client.log.warn("Failed to delete invalid or expired prompt.");
			});
		}

		this.#_magicButton.onCollect(async (buttonPress) => {
			const customId = buttonPress.data?.customId;
			if (customId === undefined) {
				return;
			}

			const [_, partialId, ...metadata] = decodeId<InteractionData>(customId);
			if (partialId === undefined) {
				return;
			}

			const handle = this.handlerByPartialId.get(partialId);
			if (handle === undefined) {
				return;
			}

			handle(buttonPress, [partialId, ...metadata] as InteractionData);
		});

		this.client.registerInteractionCollector(this.#_magicButton);

		if (this.#_removeButton !== undefined) {
			this.#_removeButton?.onCollect(async (buttonPress) => {
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
				switch (this.type) {
					case "reports": {
						management = (configuration as Configurations["reports"]).management;
						break;
					}
					case "resources": {
						management = (configuration as Configurations["resources"])?.management;
						break;
					}
					case "suggestions": {
						management = (configuration as Configurations["suggestions"]).management;
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
					const localeData = await getLocaleData(this.client, buttonPress);
					const locale = localeData.locale;

					if (this.deleteMode === "delete") {
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
					} else if (this.deleteMode === "close") {
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

				const [_, partialId] = decodeId(customId);
				if (partialId === undefined) {
					return;
				}

				const prompt = this.promptByPartialId.get(partialId);
				if (prompt === undefined) {
					return;
				}

				const promptDocument = this.documentByPromptId.get(prompt.id);
				if (promptDocument === undefined) {
					return;
				}

				this.handleDelete(promptDocument);
			});

			this.client.registerInteractionCollector(this.#_removeButton);
		}
	}

	async stop(): Promise<void> {
		this.documents.clear();

		this.handlerByPartialId.clear();
		this.promptByPartialId.clear();
		this.documentByPromptId.clear();
		this.userIdByPromptId.clear();

		this.#_magicButton.close();
		this.#_removeButton?.close();
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
		this.client.bot.rest
			.deleteMessage(message.channelId, message.id)
			.catch(() =>
				this.client.log.warn(
					`Failed to delete prompt ${diagnostics.display.message(message)} from ${diagnostics.display.channel(
						message.channelId,
					)} on ${diagnostics.display.guild(message.guildId ?? 0n)}.`,
				),
			);
	}

	abstract getAllDocuments(): Map<string, M>;
	abstract getUserDocument(promptDocument: M): Promise<User>;

	abstract getPromptContent(user: Logos.User, promptDocument: M): Discord.CreateMessageOptions | undefined;

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

	async savePrompt(user: Logos.User, promptDocument: M): Promise<Discord.CamelizedDiscordMessage | undefined> {
		const channelId = this.channelId;
		if (channelId === undefined) {
			return undefined;
		}

		const content = this.getPromptContent(user, promptDocument);
		if (content === undefined) {
			return undefined;
		}

		const message = await this.client.bot.rest.sendMessage(channelId, content).catch(() => {
			this.client.log.warn(`Failed to send message to ${diagnostics.display.channel(channelId)}.`);
			return undefined;
		});

		return message;
	}

	registerDocument(promptDocument: M): void {
		this.documents.set(promptDocument.partialId, promptDocument);
	}

	unregisterDocument(promptDocument: M): void {
		this.documents.delete(promptDocument.partialId);
	}

	registerPrompt(prompt: Discord.CamelizedDiscordMessage, userId: bigint, promptDocument: M): void {
		this.documentByPromptId.set(prompt.id, promptDocument);
		this.userIdByPromptId.set(prompt.id, userId);
		this.promptByPartialId.set(promptDocument.partialId, prompt);
	}

	unregisterPrompt(prompt: Discord.CamelizedDiscordMessage, promptDocument: M): void {
		this.documentByPromptId.delete(prompt.id);
		this.userIdByPromptId.delete(prompt.id);
		this.promptByPartialId.delete(promptDocument.partialId);
	}

	registerHandler(promptDocument: M): void {
		this.handlerByPartialId.set(promptDocument.partialId, async (interaction) => {
			const customId = interaction.data?.customId;
			if (customId === undefined) {
				return;
			}

			const [_, partialId, ...metadata] = decodeId<InteractionData>(customId);

			const updatedDocument = await this.handleInteraction(interaction, [partialId, ...metadata] as InteractionData);
			if (updatedDocument === undefined) {
				return;
			}

			const prompt = this.promptByPartialId.get(partialId);
			if (prompt === undefined) {
				return;
			}

			if (updatedDocument === null) {
				this.unregisterDocument(promptDocument);
				this.unregisterPrompt(prompt, promptDocument);
				this.unregisterHandler(promptDocument);
			} else {
				this.documentByPromptId.set(prompt.id, updatedDocument);
			}

			this.client.bot.rest.deleteMessage(prompt.channelId, prompt.id).catch(() => {
				this.client.log.warn("Failed to delete prompt.");
			});
		});
	}

	unregisterHandler(promptDocument: M): void {
		this.handlerByPartialId.delete(promptDocument.partialId);
	}

	abstract handleInteraction(interaction: Logos.Interaction, data: InteractionData): Promise<M | undefined | null>;

	protected async handleDelete(promptDocument: M): Promise<void> {
		await promptDocument.delete(this.client);

		const prompt = this.promptByPartialId.get(promptDocument.partialId);
		if (prompt !== undefined) {
			this.client.bot.rest
				.deleteMessage(prompt.channelId, prompt.id)
				.catch(() => this.client.log.warn("Failed to delete prompt after deleting document."));
			this.unregisterPrompt(prompt, promptDocument);
		}

		this.unregisterDocument(promptDocument);
		this.unregisterHandler(promptDocument);
	}
}

export { PromptService, Configurations };
