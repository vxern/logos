import { Bot, CreateMessage, deleteMessage, Guild, Message, MessageComponents, sendMessage } from 'discordeno';
import {
	generateInformationNotice,
	lastUpdatedAt as informationLastUpdatedAt,
} from 'logos/src/services/notices/channels/information.ts';
import { generateRoleNotice, lastUpdatedAt as rolesLastUpdatedAt } from 'logos/src/services/notices/channels/roles.ts';
import {
	generateWelcomeNotice,
	lastUpdatedAt as welcomeLastUpdatedAt,
} from 'logos/src/services/notices/channels/welcome.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';
import { Client, extendEventHandler, isServicing, localise } from 'logos/src/client.ts';
import { getAllMessages, getTextChannel } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { timestamp, TimestampFormat } from 'logos/formatting.ts';

const service: ServiceStarter = ([client, bot]: [Client, Bot]) => {
	registerPastNotices([client, bot]);
	ensureNoticePersistence([client, bot]);
};

type NoticeGenerator = ([client, bot]: [Client, Bot], guild: Guild) => CreateMessage | Promise<CreateMessage>;

const noticeGenerators = {
	'information': generateInformationNotice,
	'roles': generateRoleNotice,
	'welcome': generateWelcomeNotice,
} satisfies Partial<Record<keyof typeof configuration.guilds.channels, NoticeGenerator>>;
type NoticeTypes = keyof typeof noticeGenerators;

const lastUpdates: Record<NoticeTypes, Date> = {
	'information': informationLastUpdatedAt,
	'roles': rolesLastUpdatedAt,
	'welcome': welcomeLastUpdatedAt,
};

const noticeIds: bigint[] = [];
const noticeChannelIdsByGuildId: Record<NoticeTypes, Map<bigint, bigint>> = {
	'information': new Map(),
	'roles': new Map(),
	'welcome': new Map(),
};
const noticeByChannelId = new Map<bigint, Message>();

function registerPastNotices([client, bot]: [Client, Bot]): void {
	extendEventHandler(bot, 'guildCreate', { append: true }, (_, { id: guildId }) => {
		if (!isServicing(client, guildId)) return;

		const guild = client.cache.guilds.get(guildId)!;

		for (const notice of Object.keys(noticeGenerators) as NoticeTypes[]) {
			registerPastNotice([client, bot], guild, notice);
		}
	});
}

function ensureNoticePersistence([client, bot]: [Client, Bot]): void {
	// Anti-tampering feature; detects notices being deleted.
	extendEventHandler(bot, 'messageDelete', { prepend: true }, (_, { id, channelId, guildId }) => {
		if (!isServicing(client, guildId!)) return;

		// If the deleted message was not a notice.
		if (!noticeIds.includes(id)) {
			return;
		}

		postAndRegisterNotice([client, bot], channelId);
	});

	// Anti-tampering feature; detects embeds being deleted from notices.
	extendEventHandler(bot, 'messageUpdate', { prepend: true }, (bot, message, _) => {
		if (!isServicing(client, message.guildId!)) return;

		// If the message was updated in any other channel apart from a verification channel.
		if (!noticeIds.includes(message.id)) {
			return;
		}

		// If the embed is still present, it wasn't an embed having been deleted. Do not do anything.
		if (message.embeds.length === 1) return;

		// Delete the message and allow the bot to handle the deletion.
		deleteMessage(bot, message.channelId, message.id)
			.catch(() =>
				client.log.warn(
					`Failed to delete notice with ID ${message.id} from channel with ID ${message.channelId} on guild with ID ${message.guildId}.`,
				)
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

	const noticesAll = await getAllMessages([client, bot], channelId) ?? [];
	const notices = getValidNotices([client, bot], noticesAll);

	if (notices.length === 0) {
		client.log.info(`Found no notice in ${type} channel on ${guild.name}. Creating...`);

		const noticeContent = await noticeGenerators[type]([client, bot], guild);
		return void postAndRegisterNotice([client, bot], channelId, noticeContent);
	}

	const latestNotice = notices.splice(0, 1).at(0)!;
	const timestamp = extractTimestamp(latestNotice)!;

	if (timestamp !== lastUpdates[type].getTime() / 1000) {
		client.log.info(`Found outdated notice in ${type} channel on ${guild.name}. Recreating...`);

		deleteMessage(bot, latestNotice.channelId, latestNotice.id)
			.catch(() =>
				client.log.warn(
					`Failed to delete notice with ID ${latestNotice.id} from channel with ID ${latestNotice.channelId} on guild with ID ${latestNotice.guildId}.`,
				)
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
			deleteMessage(bot, notice.channelId, notice.id)
				.catch(() =>
					client.log.warn(
						`Failed to delete notice with ID ${notice.id} from channel with ID ${notice.channelId} on guild with ID ${notice.guildId}.`,
					)
				);
		}
	}
}

async function postAndRegisterNotice(
	[client, bot]: [Client, Bot],
	channelId: bigint,
	noticeContent?: CreateMessage,
): Promise<void> {
	const { embeds, components } = noticeContent ?? noticeByChannelId.get(channelId)!;
	const notice = await sendMessage(bot, channelId, { embeds, components: components as MessageComponents })
		.catch(() => {
			client.log.warn(`Failed to post notice to channel with ID ${channelId}.`);
			return undefined;
		});
	if (notice === undefined) return undefined;

	noticeIds.push(notice.id);
	noticeByChannelId.set(channelId, notice);
}

const timestampPattern = /.+?<t:(\d+):[tTdDfFR]>/;

function extractTimestamp(notice: Message | CreateMessage): number | undefined {
	const timestampString = notice.embeds?.at(0)?.description?.split('\n')?.at(0)?.replaceAll('*', '');
	if (timestampString === undefined) return undefined;
	if (!timestampPattern.test(timestampString)) return undefined;

	const [_, timestamp] = timestampPattern.exec(timestampString)!;

	return Number(timestamp!);
}

function getValidNotices([client, bot]: [Client, Bot], notices: Message[]): Message[] {
	return notices.filter(
		(notice) => {
			if (extractTimestamp(notice) === undefined) {
				deleteMessage(bot, notice.channelId, notice.id)
					.catch(() =>
						client.log.warn(
							`Failed to delete notice with ID ${notice.id} from channel with ID ${notice.channelId} on guild with ID ${notice.guildId}.`,
						)
					);
				return false;
			}

			return true;
		},
	);
}

function getLastUpdateString(client: Client, updatedAt: Date, locale: string | undefined): string {
	const strings = {
		lastUpdate: localise(client, 'notices.lastUpdate', locale)(
			{ 'date': timestamp(updatedAt.getTime(), TimestampFormat.LongDate) },
		),
	};

	return `*${strings.lastUpdate}*`;
}

export default service;
export { getLastUpdateString };
export type { NoticeGenerator };
