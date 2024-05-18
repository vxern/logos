import type { Client } from "logos/client";
import { Collector } from "logos/collectors";
import type { Guild } from "logos/models/guild";
import { LocalService } from "logos/services/service";
import type { ServiceStore } from "logos/stores/services";
import Hash from "object-hash";

type HashableProperties = "embeds" | "components";
type HashableMessageContents = Pick<Discord.CreateMessageOptions, HashableProperties>;

interface NoticeData {
	readonly id: bigint;
	readonly hash: string;
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

type NoticeTypes = keyof ServiceStore["local"]["notices"];

abstract class NoticeService<Generic extends { type: NoticeTypes }> extends LocalService {
	static readonly #configurationLocators = Object.freeze({
		information: (guildDocument) => guildDocument.informationNotice,
		resources: (guildDocument) => guildDocument.resourceNotice,
		roles: (guildDocument) => guildDocument.roleNotice,
		welcome: (guildDocument) => guildDocument.welcomeNotice,
	} as const satisfies ConfigurationLocators);

	readonly #configuration: ConfigurationLocators[Generic["type"]];
	readonly #messageUpdates: Collector<"messageUpdate">;
	readonly #messageDeletes: Collector<"messageDelete">;
	#noticeData: NoticeData | undefined;

	get configuration(): NonNullable<Configurations[Generic["type"]]> {
		return this.#configuration(this.guildDocument)!;
	}

	get channelId(): bigint | undefined {
		return this.configuration.channelId !== undefined ? BigInt(this.configuration.channelId) : undefined;
	}

	constructor(
		client: Client,
		{ identifier, guildId }: { identifier: string; guildId: bigint },
		{ type }: { type: Generic["type"] },
	) {
		super(client, { identifier, guildId });

		this.#configuration = NoticeService.#configurationLocators[type];
		this.#messageUpdates = new Collector<"messageUpdate">({ guildId });
		this.#messageDeletes = new Collector<"messageDelete">({ guildId });
	}

	static encodeHashInGuildIcon({ guild, hash }: { guild: Logos.Guild; hash: string }): string {
		const iconUrl = Discord.guildIconUrl(guild.id, guild.icon);

		return `${iconUrl}&hash=${hash}`;
	}

	async start(): Promise<void> {
		this.#messageUpdates.onCollect(this.#handleMessageUpdate.bind(this));
		this.#messageDeletes.onCollect((payload) => {
			const message = this.client.entities.messages.latest.get(payload.id);
			if (message === undefined) {
				return;
			}

			this.#handleMessageDelete(message);
		});

		await this.client.registerCollector("messageUpdate", this.#messageUpdates);
		await this.client.registerCollector("messageDelete", this.#messageDeletes);

		const channelId = this.channelId;
		if (channelId === undefined) {
			return;
		}

		const expectedContents = this.generateNotice();
		if (expectedContents === undefined) {
			return;
		}

		const expectedHash = NoticeService.hash(expectedContents);

		const noticesAll = await this.getAllMessages({ channelId });
		if (noticesAll === undefined || noticesAll.length === 0) {
			const notice = await this.saveNotice(expectedContents, expectedHash);
			if (notice === undefined) {
				return;
			}

			this.registerNotice(BigInt(notice.id), expectedHash);
			return;
		}

		if (noticesAll.length > 1) {
			while (noticesAll.length !== 0) {
				const notice = noticesAll.pop();
				if (notice === undefined) {
					return;
				}

				await this.client.bot.helpers.deleteMessage(channelId, notice.id).catch(() => {
					this.log.warn("Failed to delete notice.");
				});
			}
		}

		if (noticesAll.length === 1) {
			const notice = noticesAll.pop();
			if (notice === undefined) {
				return;
			}

			const { embeds, components }: HashableMessageContents = notice as unknown as HashableMessageContents;
			const contents: HashableMessageContents = { embeds, components };

			const hash = contents.embeds?.at(-1)?.footer?.iconUrl?.split("&hash=").at(-1);
			if (hash === undefined || hash !== expectedHash) {
				await this.client.bot.helpers.deleteMessage(channelId, notice.id).catch(() => {
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
		await this.#messageUpdates.close();
		await this.#messageDeletes.close();

		this.#noticeData = undefined;
	}

	// Anti-tampering feature; detects notices being changed from the outside (embeds being deleted).
	async #handleMessageUpdate(message: Discord.Message): Promise<void> {
		// If the message was updated in a channel not managed by this notice manager.
		if (message.channelId !== this.channelId) {
			return;
		}

		// Delete the message and allow the bot to handle the deletion.
		this.client.bot.helpers
			.deleteMessage(message.channelId, message.id)
			.catch(() =>
				this.log.warn(
					`Failed to delete notice ${this.client.diagnostics.message(
						message,
					)} from ${this.client.diagnostics.channel(message.channelId)} on ${this.client.diagnostics.guild(
						message.guildId ?? 0n,
					)}.`,
				),
			);
	}

	// Anti-tampering feature; detects notices being deleted.
	async #handleMessageDelete(message: Logos.Message): Promise<void> {
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

	abstract generateNotice(): HashableMessageContents | undefined;

	async saveNotice(contents: HashableMessageContents, hash: string): Promise<Discord.Message | undefined> {
		const [channelId, guild] = [this.channelId, this.guild];
		if (channelId === undefined || guild === undefined) {
			return undefined;
		}

		const lastEmbed = contents.embeds?.at(-1);
		if (lastEmbed === undefined) {
			return undefined;
		}

		lastEmbed.footer = { text: guild.name, iconUrl: NoticeService.encodeHashInGuildIcon({ guild, hash }) };

		return this.client.bot.helpers.sendMessage(channelId, contents).catch(() => {
			this.log.warn(`Failed to send message to ${this.client.diagnostics.channel(channelId)}.`);
			return undefined;
		});
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

export { NoticeService };
export type { HashableMessageContents };
