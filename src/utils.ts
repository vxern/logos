import { Bot, Channel, ChannelTypes, Embed, getGuildIconURL, getMessages, Guild, Message, User } from 'discordeno';
import { code } from 'logos/formatting.ts';
import { Document } from 'logos/src/database/document.ts';

/**
 * Parses a 6-digit hex value prefixed with a hashtag to a number.
 *
 * @param color - The color represented as a 6-digit hexadecimal value prefixed
 * with a hashtag.
 * @returns The decimal form.
 */
function fromHex(color: string): number {
	return parseInt(color.replace('#', '0x'));
}

type TextChannel = Channel & { type: ChannelTypes.GuildText };

type VoiceChannel = Channel & { type: ChannelTypes.GuildVoice };

function isText(channel: Channel): channel is TextChannel {
	return channel.type === ChannelTypes.GuildText;
}

function isVoice(channel: Channel): channel is VoiceChannel {
	return channel.type === ChannelTypes.GuildVoice;
}

/**
 * Taking a guild and the name of a channel, finds the channel with that name
 * and returns it.
 *
 * @param guild - The guild whose channels to look through.
 * @param name - The name of the channel to find.
 * @returns The found channel.
 */
function getTextChannel(guild: Guild, name: string): Channel | undefined {
	const nameAsLowercase = name.toLowerCase();

	const textChannels = guild.channels.array().filter((channel) => isText(channel));

	return textChannels.find((channel) => channel.name!.toLowerCase().includes(nameAsLowercase));
}

/**
 * Taking a user object, creates an informational mention for the user.
 *
 * @param user - The user object.
 * @returns The mention.
 */
function diagnosticMentionUser(user: User, doNotFormat?: boolean): string {
	const tag = `${user.username}#${user.discriminator}`;

	if (doNotFormat) return `${tag} (${user.id})`;

	return `${code(tag)} (${code(user.id.toString())})`;
}

/**
 * Taking an array, splits it into parts of equal sizes.
 *
 * @param array - The array to chunk.
 * @param size - The size of each chunk.
 * @returns The chunked array.
 */
function chunk<T>(array: T[], size: number): T[][] {
	if (array.length === 0) return [[]];
	if (size === 0) throw new Error('The size of a chunk cannot be zero.');

	const chunks = [];
	for (let index = 0; index < array.length; index += size) {
		chunks.push(array.slice(index, index + size));
	}
	return chunks;
}

const beginningOfDiscordEpoch = 1420070400000n;
const snowflakeBitsToDiscard = 22n;

function snowflakeToTimestamp(snowflake: bigint): number {
	return Number(
		(snowflake >> snowflakeBitsToDiscard) + beginningOfDiscordEpoch,
	);
}

function getGuildIconURLFormatted(bot: Bot, guild: Guild): string | undefined {
	const iconURL = getGuildIconURL(bot, guild.id, guild.icon, {
		size: 4096,
		format: 'png',
	});

	return iconURL;
}

type Author = NonNullable<Embed['author']>;

function getAuthor(bot: Bot, guild: Guild): Author | undefined {
	const iconURL = getGuildIconURLFormatted(bot, guild);
	if (iconURL === undefined) return undefined;

	return {
		name: guild.name,
		iconUrl: iconURL,
	};
}

/**
 * Taking a URL and a list of parameters, returns the URL with the parameters appended
 * to it.
 *
 * @param url - The URL to format.
 * @param parameters - The parameters to append to the URL.
 * @returns The formatted URL.
 */
function addParametersToURL(
	url: string,
	parameters: Record<string, string>,
): string {
	const query = Object.entries(parameters)
		.map(([key, value]) => {
			const valueEncoded = encodeURIComponent(value);
			return `${key}=${valueEncoded}`;
		})
		.join('&');

	if (query.length === 0) return url;

	return `${url}?${query}`;
}

/**
 * Taking a channel ID, sequentially fetches all messages in a channel.
 *
 * @privateRemarks
 *
 * Use this function solely in channels where the number of messages is expected to be relatively low.
 *
 * @param bot - The bot instance to use to make the requests.
 * @param channelId - The ID of the channel to get the messages of.
 * @returns An array of messages.
 */
async function getAllMessages(bot: Bot, channelId: bigint): Promise<Message[]> {
	const messages: Message[] = [];
	let isFinished = false;

	while (!isFinished) {
		const buffer = await getMessages(bot, channelId, {
			limit: 100,
			before: messages.length === 0 ? undefined : messages[messages.length - 1]!.id,
		});

		if (buffer.size < 100) {
			isFinished = true;
		}

		messages.push(...buffer.values());
	}

	return messages;
}

function verifyIsWithinLimits(documents: Document[], limit: number, limitingTimePeriod: number): boolean {
	const actionTimestamps = documents
		.map((document) => document.data.createdAt)
		.toSorted((a, b) => b - a); // From most recent to least recent.
	const relevantTimestamps = actionTimestamps.slice(0, limit);

	if (relevantTimestamps.length < limit) return true; // Has not reached the limit, regardless of the limiting time period.

	const now = Date.now();
	for (const timestamp of relevantTimestamps) {
		if ((now - timestamp) < limitingTimePeriod) continue;
		return true;
	}

	return false;
}

export {
	addParametersToURL,
	chunk,
	diagnosticMentionUser,
	fromHex,
	getAllMessages,
	getAuthor,
	getGuildIconURLFormatted,
	getTextChannel,
	isText,
	isVoice,
	snowflakeToTimestamp,
	verifyIsWithinLimits,
};
