import configuration from "../../../configuration.js";
import { TimestampFormat, timestamp } from "../../../formatting.js";
import { Client, extendEventHandler, isServicing, localise } from "../../client.js";
import { getAllMessages, getTextChannel } from "../../utils.js";
import { ServiceStarter } from "../services.js";
import { generateInformationNotice, lastUpdatedAt as informationLastUpdatedAt } from "./channels/information.js";
import { generateRoleNotice, lastUpdatedAt as rolesLastUpdatedAt } from "./channels/roles.js";
import { generateWelcomeNotice, lastUpdatedAt as welcomeLastUpdatedAt } from "./channels/welcome.js";
import { Bot, CreateMessage, Guild, Message, MessageComponents, deleteMessage, sendMessage } from "discordeno";

const service: ServiceStarter = ([client, bot]: [Client, Bot]) => {
	registerPastNotices([client, bot]);
	ensureNoticePersistence([client, bot]);
};

type NoticeGenerator = ([client, bot]: [Client, Bot], guild: Guild) => CreateMessage | Promise<CreateMessage>;

const noticeGenerators = {
	information: generateInformationNotice,
	roles: generateRoleNotice,
	welcome: generateWelcomeNotice,
} satisfies Partial<Record<keyof typeof configuration.guilds.channels, NoticeGenerator>>;
type NoticeTypes = keyof typeof noticeGenerators;

const lastUpdates: Record<NoticeTypes, Date> = {
	information: informationLastUpdatedAt,
	roles: rolesLastUpdatedAt,
	welcome: welcomeLastUpdatedAt,
};

const noticeIds: bigint[] = [];
const noticeChannelIdsByGuildId: Record<NoticeTypes, Map<bigint, bigint>> = {
	information: new Map(),
	roles: new Map(),
	welcome: new Map(),
};
const noticeByChannelId = new Map<bigint, Message>();

function registerPastNotices([client, bot]: [Client, Bot]): void {
	extendEventHandler(bot, "guildCreate", { append: true }, (_, { id: guildId }) => {
		if (!isServicing(client, guildId)) {
			return;
		}

		const guild = client.cache.guilds.get(guildId);
		if (guild === undefined) {
			return;
		}

		for (const notice of Object.keys(noticeGenerators) as NoticeTypes[]) {
			registerPastNotice([client, bot], guild, notice);
		}
	});
}

function ensureNoticePersistence([client, bot]: [Client, Bot]): void {
	// Anti-tampering feature; detects notices being deleted.
	extendEventHandler(bot, "messageDelete", { prepend: true }, (_, { id, channelId, guildId }) => {
		if (guildId === undefined) {
			return;
		}

		if (!isServicing(client, guildId)) {
			return;
		}

		// If the deleted message was not a notice.
		if (!noticeIds.includes(id)) {
			return;
		}

		postAndRegisterNotice([client, bot], channelId);
	});

	// Anti-tampering feature; detects embeds being deleted from notices.
	extendEventHandler(bot, "messageUpdate", { prepend: true }, (bot, message, _) => {
		const guildId = message.guildId;
		if (guildId === undefined) {
			return;
		}

		if (!isServicing(client, guildId)) {
			return;
		}

		// If the message was updated in any other channel apart from a verification channel.
		if (!noticeIds.includes(message.id)) {
			return;
		}

		// If the embed is still present, it wasn't an embed having been deleted. Do not do anything.
		if (message.embeds.length === 1) {
			return;
		}

		// Delete the message and allow the bot to handle the deletion.
		deleteMessage(bot, message.channelId, message.id).catch(() =>
			client.log.warn(
				`Failed to delete notice with ID ${message.id} from channel with ID ${message.channelId} on guild with ID ${message.guildId}.`,
			),
		);
	});
}

async function registerPastNotice([client, bot]: [Client, Bot], guild: Guild, type: NoticeTypes): Promise<void> {
	const channelId = getTextChannel(guild, configuration.guilds.channels[type])?.id;
	if (channelId === undefined) {
		client.log.error(
			`Failed to register previous ${type} notice on ${guild.name}: There is no channel for that notice.`,
		);
		return;
	}

	noticeChannelIdsByGuildId[type].set(guild.id, channelId);

	const noticesAll = (await getAllMessages([client, bot], channelId)) ?? [];
	const notices = getValidNotices([client, bot], noticesAll);

	if (notices.length === 0) {
		client.log.info(`Found no notice in ${type} channel on ${guild.name}. Creating...`);

		const noticeContent = await noticeGenerators[type]([client, bot], guild);
		postAndRegisterNotice([client, bot], channelId, noticeContent);
		return;
	}

	const latestNotice = notices.shift();
	if (latestNotice === undefined) {
		return;
	}

	const timestamp = extractTimestamp(latestNotice);
	if (timestamp === undefined) {
		return;
	}

	if (timestamp !== lastUpdates[type].getTime() / 1000) {
		client.log.info(`Found outdated notice in ${type} channel on ${guild.name}. Recreating...`);

		deleteMessage(bot, latestNotice.channelId, latestNotice.id).catch(() =>
			client.log.warn(
				`Failed to delete notice with ID ${latestNotice.id} from channel with ID ${latestNotice.channelId} on guild with ID ${latestNotice.guildId}.`,
			),
		);

		const noticeContent = await noticeGenerators[type]([client, bot], guild);
		postAndRegisterNotice([client, bot], channelId, noticeContent);
	} else {
		noticeIds.push(latestNotice.id);
		noticeByChannelId.set(latestNotice.channelId, latestNotice);
	}

	if (notices.length > 1) {
		client.log.debug(
			`Detected ${notices.length} surplus notice(s) in ${type} channel on ${guild.name}. Deleting older notices...`,
		);
		for (const notice of notices) {
			deleteMessage(bot, notice.channelId, notice.id).catch(() =>
				client.log.warn(
					`Failed to delete notice with ID ${notice.id} from channel with ID ${notice.channelId} on guild with ID ${notice.guildId}.`,
				),
			);
		}
	}
}

async function postAndRegisterNotice(
	[client, bot]: [Client, Bot],
	channelId: bigint,
	noticeContent?: CreateMessage,
): Promise<void> {
	const noticeContent_ = noticeContent ?? noticeByChannelId.get(channelId);
	if (noticeContent_ === undefined) {
		return;
	}
	const { embeds, components } = noticeContent_;
	const notice = await sendMessage(bot, channelId, { embeds, components: components as MessageComponents }).catch(
		() => {
			client.log.warn(`Failed to post notice to channel with ID ${channelId}.`);
			return undefined;
		},
	);
	if (notice === undefined) {
		return undefined;
	}

	noticeIds.push(notice.id);
	noticeByChannelId.set(channelId, notice);
}

const timestampPattern = /.+?<t:(\d+):[tTdDfFR]>/;

function extractTimestamp(notice: Message | CreateMessage): number | undefined {
	const timestampString = notice.embeds?.at(0)?.description?.split("\n")?.at(0)?.replaceAll("*", "");
	if (timestampString === undefined) {
		return undefined;
	}

	const [_, timestamp] = timestampPattern.exec(timestampString) ?? [];
	if (timestamp === undefined) {
		return undefined;
	}

	return Number(timestamp);
}

function getValidNotices([client, bot]: [Client, Bot], notices: Message[]): Message[] {
	return notices.filter((notice) => {
		if (extractTimestamp(notice) === undefined) {
			deleteMessage(bot, notice.channelId, notice.id).catch(() =>
				client.log.warn(
					`Failed to delete notice with ID ${notice.id} from channel with ID ${notice.channelId} on guild with ID ${notice.guildId}.`,
				),
			);
			return false;
		}

		return true;
	});
}

function getLastUpdateString(client: Client, updatedAt: Date, locale: string | undefined): string {
	const strings = {
		lastUpdate: localise(
			client,
			"notices.lastUpdate",
			locale,
		)({ date: timestamp(updatedAt.getTime(), TimestampFormat.LongDate) }),
	};

	return `*${strings.lastUpdate}*`;
}

export default service;
export { getLastUpdateString };
export type { NoticeGenerator };
