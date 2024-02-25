import * as Discord from "@discordeno/bot";
import Hash from "object-hash";
import { Client, ServiceStore } from "../../client";
import { Guild } from "../../database/guild";
import diagnostics from "../../diagnostics";
import { getAllMessages } from "../../utils";
import { LocalService } from "../service";

type HashableProperties = "embeds" | "components";
type HashableMessageContents = Pick<Discord.CreateMessageOptions, HashableProperties>;

interface NoticeData {
	id: bigint;
	hash: string;
}

interface Configurations {
	information: Guild["informationNotice"];
	resources: Guild["resourceNotice"];
	roles: Guild["roleNotice"];
	welcome: Guild["welcomeNotice"];
}

type ConfigurationLocators = {
	[K in keyof Configurations]: (guildDocument: Guild) => Configurations[K] | undefined;
};

const configurationLocators: ConfigurationLocators = {
	information: (guildDocument) => guildDocument.informationNotice,
	resources: (guildDocument) => guildDocument.resourceNotice,
	roles: (guildDocument) => guildDocument.roleNotice,
	welcome: (guildDocument) => guildDocument.welcomeNotice,
};

type NoticeTypes = keyof ServiceStore["local"]["notices"];

abstract class NoticeService<Generic extends { type: NoticeTypes }> extends LocalService {
	#noticeData: NoticeData | undefined;

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

		const channelId = BigInt(configuration.channelId);
		if (channelId === undefined) {
			return undefined;
		}

		return channelId;
	}

	constructor(
		client: Client,
		{ identifier, guildId }: { identifier: string; guildId: bigint },
		{ type }: { type: Generic["type"] },
	) {
		super(client, { identifier, guildId });

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

		const expectedContents = this.generateNotice();
		if (expectedContents === undefined) {
			return;
		}

		const expectedHash = NoticeService.hash(expectedContents);

		const noticesAll = (await getAllMessages(this.client, channelId)) ?? [];
		if (noticesAll.length > 1) {
			while (noticesAll.length !== 0) {
				const notice = noticesAll.pop();
				if (notice === undefined) {
					return;
				}

				await this.client.bot.rest.deleteMessage(channelId, notice.id).catch(() => {
					this.log.warn("Failed to delete notice.");
				});
			}
		}

		if (noticesAll.length === 0) {
			const notice = await this.saveNotice(expectedContents, expectedHash);
			if (notice === undefined) {
				return;
			}

			this.registerNotice(BigInt(notice.id), expectedHash);
			return;
		}

		if (noticesAll.length === 1) {
			const notice = noticesAll.pop();
			if (notice === undefined) {
				return;
			}

			const { embeds, components }: HashableMessageContents = notice as HashableMessageContents;
			const contents: HashableMessageContents = { embeds, components };

			const hash = contents.embeds?.at(-1)?.footer?.iconUrl?.split("&hash=").at(-1);
			if (hash === undefined || hash !== expectedHash) {
				await this.client.bot.rest.deleteMessage(channelId, notice.id).catch(() => {
					this.log.warn("Failed to delete notice.");
				});

				const newNotice = await this.saveNotice(expectedContents, expectedHash);
				if (newNotice === undefined) {
					return;
				}

				this.registerNotice(BigInt(newNotice.id), expectedHash);
				return;
			}

			this.registerNotice(BigInt(notice.id), hash);
			return;
		}
	}

	async stop(): Promise<void> {
		this.#noticeData = undefined;
	}

	// Anti-tampering feature; detects notices being deleted.
	async messageDelete(message: Discord.Message): Promise<void> {
		const [channelId, noticeData] = [this.channelId, this.#noticeData];
		if (channelId === undefined || noticeData === undefined) {
			return;
		}

		// If the message was deleted from a channel not managed by this prompt manager.
		if (message.channelId !== this.channelId) {
			return;
		}

		if (message.id !== noticeData.id) {
			return;
		}

		const contents = this.generateNotice();
		if (contents === undefined) {
			return;
		}

		const hash = NoticeService.hash(contents);

		const notice = await this.saveNotice(contents, hash);
		if (notice === undefined) {
			return;
		}

		this.registerNotice(BigInt(notice.id), hash);
	}

	async messageUpdate(message: Discord.Message): Promise<void> {
		// If the message was updated in a channel not managed by this prompt manager.
		if (message.channelId !== this.channelId) {
			return;
		}

		// Delete the message and allow the bot to handle the deletion.
		this.client.bot.rest
			.deleteMessage(message.channelId, message.id)
			.catch(() =>
				this.log.warn(
					`Failed to delete notice ${diagnostics.display.message(message)} from ${diagnostics.display.channel(
						message.channelId,
					)} on ${diagnostics.display.guild(message.guildId ?? 0n)}.`,
				),
			);
	}

	abstract generateNotice(): HashableMessageContents | undefined;

	async saveNotice(
		contents: HashableMessageContents,
		hash: string,
	): Promise<Discord.CamelizedDiscordMessage | undefined> {
		const [channelId, guild] = [this.channelId, this.guild];
		if (channelId === undefined || guild === undefined) {
			return undefined;
		}

		const lastEmbed = contents.embeds?.at(-1);
		if (lastEmbed === undefined) {
			return undefined;
		}

		lastEmbed.footer = { text: guild.name, iconUrl: `${Discord.guildIconUrl(guild.id, guild.icon)}&hash=${hash}` };

		const message = await this.client.bot.rest.sendMessage(channelId, contents).catch(() => {
			this.log.warn(`Failed to send message to ${diagnostics.display.channel(channelId)}.`);
			return undefined;
		});

		return message;
	}

	registerNotice(noticeId: bigint, hash: string): void {
		this.#noticeData = { id: noticeId, hash };
	}

	static hash(contents: HashableMessageContents): string {
		return Hash(contents, {
			algorithm: "md5",
			unorderedArrays: true,
			unorderedObjects: true,
			unorderedSets: true,
		});
	}
}

export { NoticeService, HashableMessageContents };
