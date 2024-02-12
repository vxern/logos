import * as Discord from "@discordeno/bot";
import constants from "../../../constants/constants";
import * as Logos from "../../../types";
import { Client, InteractionCollector, ServiceStore } from "../../client";
import { Guild } from "../../database/guild";
import { User } from "../../database/user";
import diagnostics from "../../diagnostics";
import { acknowledge, decodeId, getLocaleData, reply } from "../../interactions";
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
	// TODO(vxern): This is a hack, get the fuck rid of this.
	DataType extends { id: string },
	InteractionData extends [compositeId: string, ...data: string[]],
> extends LocalService {
	private readonly type: PromptType;
	private readonly customId: string;
	private readonly deleteMode: DeleteMode;

	protected readonly documents: Map<string, DataType>;

	private readonly handlerByCompositeId: Map<
		/*compositeId: */ string,
		(interaction: Discord.Interaction, data: InteractionData) => void
	> = new Map();
	protected readonly promptByCompositeId: Map</*compositeId: */ string, Discord.CamelizedDiscordMessage> = new Map();
	private readonly documentByPromptId: Map</*promptId: */ string, DataType> = new Map();
	private readonly userIdByPromptId: Map</*promptId: */ string, bigint> = new Map();

	private readonly collectingInteractions: Promise<void>;
	private readonly removingPrompts: Promise<void>;
	private stopCollectingInteractions: (() => void) | undefined;
	private stopRemovingPrompts: (() => void) | undefined;

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

	constructor(client: Client, guildId: bigint, { type, deleteMode }: { type: PromptType; deleteMode: DeleteMode }) {
		super(client, guildId);
		this.type = type;
		this.deleteMode = deleteMode;
		this.customId = customIds[type];
		this._configuration = configurationLocators[type];
		this.documents = this.getAllDocuments();
		this.collectingInteractions = new Promise((resolve) => {
			this.stopCollectingInteractions = () => resolve();
		});
		this.removingPrompts = new Promise((resolve) => {
			this.stopRemovingPrompts = () => resolve();
		});
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

		for (const [compositeId, promptDocument] of this.documents) {
			const userDocument = await this.getUserDocument(promptDocument);
			if (userDocument === undefined) {
				continue;
			}

			const userId = BigInt(userDocument.account.id);

			let prompt = prompts.get(compositeId);
			if (prompt !== undefined) {
				prompts.delete(compositeId);
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

			this.registerPrompt(prompt, userId, compositeId, promptDocument);
			this.registerDocument(compositeId, promptDocument);
			this.registerHandler(compositeId);
		}

		const expiredPrompts = Array.from(prompts.values());

		for (const prompt of [...invalidPrompts, ...expiredPrompts]) {
			await this.client.bot.rest.deleteMessage(prompt.channelId, prompt.id).catch(() => {
				this.client.log.warn("Failed to delete invalid or expired prompt.");
			});
		}

		// TODO(vxern): Dispose when the service is disposed!!!!!!!!!!!!
		const magicButton = new InteractionCollector({ customId: this.customId, isPermanent: true });

		magicButton.onCollect(async (buttonPress) => {
			const customId = buttonPress.data?.customId;
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

			handle(buttonPress, [compositeId, ...metadata] as InteractionData);
		});

		this.client.registerInteractionCollector(magicButton);

		if (this.deleteMode === "none") {
			return;
		}

		// TODO(vxern): Dispose when the service is disposed!!!!!!!!!!!!
		const removeButton = new InteractionCollector({
			customId: `${constants.components.removePrompt}/${this.customId}/${this.guildId}`,
			isPermanent: true,
		});

		removeButton.onCollect(async (buttonPress) => {
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

					reply(this.client, buttonPress, {
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

					reply(this.client, buttonPress, {
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

			acknowledge(this.client, buttonPress);

			const [_, compositeId] = decodeId(customId);
			if (compositeId === undefined) {
				return;
			}

			this.handleDelete(compositeId);
		});

		this.client.registerInteractionCollector(removeButton);
	}

	async stop(): Promise<void> {
		this.documents.clear();
		this.handlerByCompositeId.clear();
		this.promptByCompositeId.clear();
		this.documentByPromptId.clear();
		this.userIdByPromptId.clear();

		this.stopCollectingInteractions?.();
		this.stopRemovingPrompts?.();
		await this.collectingInteractions;
		await this.removingPrompts;
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

		const message = await this.client.bot.rest.sendMessage(channelId, content).catch(() => {
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

			this.client.bot.rest.deleteMessage(prompt.channelId, prompt.id).catch(() => {
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

	protected async handleDelete(compositeId: string): Promise<void> {
		const session = this.client.database.openSession();

		switch (this.type) {
			case "reports": {
				await session.delete(`reports/${compositeId}`);
				break;
			}
			case "resources": {
				await session.delete(`resources/${compositeId}`);
				break;
			}
			case "suggestions": {
				await session.delete(`suggestions/${compositeId}`);
				break;
			}
			case "tickets": {
				await session.delete(`tickets/${compositeId}`);
				break;
			}
		}

		await session.saveChanges();
		session.dispose();

		const prompt = this.promptByCompositeId.get(compositeId);
		if (prompt !== undefined) {
			this.client.bot.rest
				.deleteMessage(prompt.channelId, prompt.id)
				.catch(() => this.client.log.warn("Failed to delete prompt after deleting document."));
			this.unregisterPrompt(prompt, compositeId);
		}

		this.unregisterDocument(compositeId);
		this.unregisterHandler(compositeId);
	}
}

export { PromptService, Configurations };
