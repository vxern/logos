import { Bot, CreateMessage, deleteMessage, Guild, Message, MessageComponents, sendMessage } from 'discordeno';
import { localise, Services } from 'logos/assets/localisations/mod.ts';
import {
	generateInformationNotice,
	lastUpdatedAt as informationLastUpdatedAt,
} from 'logos/src/services/notice-generators/information.ts';
import {
	generateWelcomeNotice,
	lastUpdatedAt as welcomeLastUpdatedAt,
} from 'logos/src/services/notice-generators/welcome.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';
import { Client } from 'logos/src/client.ts';
import { getAllMessages, getTextChannel } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { timestamp, TimestampFormat } from 'logos/formatting.ts';

type NoticeGenerator = (bot: Bot, guild: Guild) => CreateMessage | Promise<CreateMessage>;

const noticeGenerators = {
	'information': generateInformationNotice,
	'welcome': generateWelcomeNotice,
} satisfies Partial<Record<keyof typeof configuration.guilds.channels, NoticeGenerator>>;
type NoticeTypes = keyof typeof noticeGenerators;

const lastUpdates: Record<NoticeTypes, Date> = {
	'information': informationLastUpdatedAt,
	'welcome': welcomeLastUpdatedAt,
};

const service: ServiceStarter = ([client, bot]: [Client, Bot]) => {
	registerPastNotices([client, bot]);
	ensureNoticePersistence(bot);
};

const noticeIds: bigint[] = [];
const noticeChannelIdsByGuildId: Record<NoticeTypes, Map<bigint, bigint>> = {
	'information': new Map(),
	'welcome': new Map(),
};
const noticeByChannelId = new Map<bigint, Message>();

function registerPastNotices([client, bot]: [Client, Bot]): void {
	const { guildCreate } = bot.events;

	bot.events.guildCreate = async (bot, guild_) => {
		await guildCreate(bot, guild_);

		const guild = client.cache.guilds.get(guild_.id)!;

		for (const notice of Object.keys(noticeGenerators) as NoticeTypes[]) {
			registerPastNotice([client, bot], guild, notice);
		}
	};
}

function ensureNoticePersistence(bot: Bot): void {
	const { messageDelete, messageUpdate } = bot.events;

	// Anti-tampering feature; detects notices being deleted.
	bot.events.messageDelete = (bot, payload) => {
		const [messageId, channelId, _guildId] = [payload.id, payload.channelId, payload.guildId!];

		// If the deleted message was not a notice.
		if (!noticeIds.includes(messageId)) {
			return messageDelete(bot, payload);
		}

		postAndRegisterNotice(bot, channelId);

		messageDelete(bot, payload);
	};

	// Anti-tampering feature; detects embeds being deleted from notices.
	bot.events.messageUpdate = (bot, message, oldMessage) => {
		// If the message was updated in any other channel apart from a verification channel.
		if (!noticeIds.includes(message.id)) {
			return messageUpdate(bot, message, oldMessage);
		}

		// If the embed is still present, it wasn't an embed having been deleted. Do not do anything.
		if (message.embeds.length === 1) return;

		// Delete the message and allow the bot to handle the deletion.
		deleteMessage(bot, message.channelId, message.id);

		messageUpdate(bot, message, oldMessage);
	};
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

	const noticesAll = await getAllMessages(bot, channelId);
	const notices = getValidNotices(bot, noticesAll);

	if (notices.length === 0) {
		client.log.info(`Found no notice in ${type} channel on ${guild.name}. Creating...`);

		const noticeContent = await noticeGenerators[type](bot, guild);
		return void postAndRegisterNotice(bot, channelId, noticeContent);
	}

	const latestNotice = notices.splice(0, 1).at(0)!;
	const timestamp = extractTimestamp(latestNotice)!;

	if (timestamp < lastUpdates[type].getTime() / 1000) {
		client.log.info(`Found outdated notice in ${type} channel on ${guild.name}. Recreating...`);

		deleteMessage(bot, latestNotice.channelId, latestNotice.id);

		const noticeContent = await noticeGenerators[type](bot, guild);
		postAndRegisterNotice(bot, channelId, noticeContent);
	} else {
		noticeIds.push(latestNotice.id);
		noticeByChannelId.set(latestNotice.channelId, latestNotice);
	}

	if (notices.length > 1) {
		client.log.debug(
			`Detected ${notices.length} surplus notice(s) in ${type} channel on ${guild.name}. Deleting older notices...`,
		);
		for (const notice of notices) {
			deleteMessage(bot, notice.channelId, notice.id);
		}
	}
}

async function postAndRegisterNotice(bot: Bot, channelId: bigint, noticeContent?: CreateMessage): Promise<Message> {
	const { embeds, components } = noticeContent ?? noticeByChannelId.get(channelId)!;
	const notice = await sendMessage(bot, channelId, { embeds, components: components as MessageComponents });

	noticeIds.push(notice.id);
	noticeByChannelId.set(channelId, notice);

	return notice;
}

const timestampPattern = /.+?<t:(\d+):[tTdDfFR]>/;

function extractTimestamp(notice: Message | CreateMessage): number | undefined {
	const timestampString = notice.embeds?.at(0)?.description?.split('\n')?.at(0)?.replaceAll('*', '');
	if (timestampString === undefined) return undefined;
	if (!timestampPattern.test(timestampString)) return undefined;

	const [_match, timestamp] = timestampPattern.exec(timestampString)!;

	return Number(timestamp!);
}

function getValidNotices(bot: Bot, notices: Message[]): Message[] {
	return notices.filter(
		(notice) => {
			if (extractTimestamp(notice) === undefined) {
				deleteMessage(bot, notice.channelId, notice.id);
				return false;
			}

			return true;
		},
	);
}

function getLastUpdateString(updatedAt: Date, locale: string | undefined): string {
	const lastUpdateString = localise(Services.notices.lastUpdate, locale)(
		timestamp(updatedAt.getTime(), TimestampFormat.LongDate),
	);

	return `*${lastUpdateString}*`;
}

export default service;
export { getLastUpdateString };
export type { NoticeGenerator };
