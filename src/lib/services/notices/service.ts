import * as Logos from "../../../types";
import { Client } from "../../client";
import { Document } from "../../database/document";
import { Guild } from "../../database/structs/guild";
import diagnostics from "../../diagnostics";
import { getAllMessages, getGuildIconURLFormatted } from "../../utils";
import { LocalService } from "../service";
import * as Discord from "discordeno";
import Hash from "object-hash";

type HashableProperties = "embeds" | "components";
type HashableMessageContents = Pick<Discord.CreateMessage, HashableProperties>;

interface NoticeData {
	id: bigint;
	hash: string;
}

interface Configurations {
	information: NonNullable<
		NonNullable<Guild["features"]["information"]["features"]>["notices"]["features"]
	>["information"];
	roles: NonNullable<NonNullable<Guild["features"]["information"]["features"]>["notices"]["features"]>["roles"];
	welcome: NonNullable<NonNullable<Guild["features"]["information"]["features"]>["notices"]["features"]>["welcome"];
}

type ConfigurationLocators = {
	[K in keyof Configurations]: (guildDocument: Document<Guild>) => Configurations[K] | undefined;
};

const configurationLocators: ConfigurationLocators = {
	information: (guildDocument) => guildDocument.data.features.information.features?.notices.features?.information,
	roles: (guildDocument) => guildDocument.data.features.information.features?.notices.features?.roles,
	welcome: (guildDocument) => guildDocument.data.features.information.features?.notices.features?.welcome,
};

type NoticeTypes = keyof Client["services"]["notices"];

abstract class NoticeService<NoticeType extends NoticeTypes> extends LocalService {
	private readonly type: NoticeType;
	private noticeData: NoticeData | undefined;

	private readonly _configuration: ConfigurationLocators[NoticeType];
	get configuration(): Configurations[NoticeType] | undefined {
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

	constructor(client: Client, guildId: bigint, { type }: { type: NoticeType }) {
		super(client, guildId);
		this.type = type;
		this.noticeData = undefined;
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

		this.client.log.info(`Registering ${this.type} notices on ${diagnostics.display.guild(guild)}...`);

		const expectedContent = this.generateNotice();
		if (expectedContent === undefined) {
			return;
		}

		const expectedHash = NoticeService.hash(expectedContent);

		const noticesAll = (await getAllMessages([this.client, bot], channelId)) ?? [];
		if (noticesAll.length > 1) {
			while (noticesAll.length !== 0) {
				const notice = noticesAll.pop();
				if (notice === undefined) {
					return;
				}

				await Discord.deleteMessage(bot, channelId, notice.id).catch(() => {
					this.client.log.warn("Failed to delete notice.");
				});
			}
		}

		if (noticesAll.length === 0) {
			const notice = await this.saveNotice(bot, expectedContent, expectedHash);
			if (notice === undefined) {
				return;
			}

			this.registerNotice(notice.id, expectedHash);
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
				await Discord.deleteMessage(bot, channelId, notice.id).catch(() => {
					this.client.log.warn("Failed to delete notice.");
				});

				const newNotice = await this.saveNotice(bot, contents, expectedHash);
				if (newNotice === undefined) {
					return;
				}

				this.registerNotice(newNotice.id, expectedHash);
				return;
			}

			this.registerNotice(notice.id, hash);
			return;
		}
	}

	// Anti-tampering feature; detects notices being deleted.
	async messageDelete(bot: Discord.Bot, message: Discord.Message): Promise<void> {
		const [channelId, noticeData] = [this.channelId, this.noticeData];
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

		const notice = await this.saveNotice(bot, contents, hash);
		if (notice === undefined) {
			return;
		}

		this.registerNotice(notice.id, hash);
	}

	async messageUpdate(bot: Discord.Bot, message: Discord.Message): Promise<void> {
		// If the message was updated in a channel not managed by this prompt manager.
		if (message.channelId !== this.channelId) {
			return;
		}

		// Delete the message and allow the bot to handle the deletion.
		Discord.deleteMessage(bot, message.channelId, message.id).catch(() =>
			this.client.log.warn(
				`Failed to delete notice ${diagnostics.display.message(message)} from ${diagnostics.display.channel(
					message.channelId,
				)} on ${diagnostics.display.guild(message.guildId ?? 0n)}.`,
			),
		);
	}

	abstract generateNotice(): HashableMessageContents | undefined;

	async saveNotice(
		bot: Discord.Bot,
		contents: HashableMessageContents,
		hash: string,
	): Promise<Logos.Message | undefined> {
		const [channelId, guild] = [this.channelId, this.guild];
		if (channelId === undefined || guild === undefined) {
			return undefined;
		}

		const lastEmbed = contents.embeds?.at(-1);
		if (lastEmbed === undefined) {
			return undefined;
		}

		lastEmbed.footer = { text: guild.name, iconUrl: `${getGuildIconURLFormatted(bot, guild)}&hash=${hash}` };

		const message = await Discord.sendMessage(bot, channelId, contents)
			.then((message) => Logos.slimMessage(message))
			.catch(() => {
				this.client.log.warn(`Failed to send message to ${diagnostics.display.channel(channelId)}.`);
				return undefined;
			});

		return message;
	}

	registerNotice(noticeId: bigint, hash: string): void {
		this.noticeData = { id: noticeId, hash };
	}

	static hash(contents: HashableMessageContents): string {
		return Hash(contents, {
			algorithm: "md5",
			respectType: false,
			unorderedArrays: true,
			unorderedObjects: true,
			unorderedSets: true,
		});
	}
}

export { NoticeService, HashableMessageContents };
