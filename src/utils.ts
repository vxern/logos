import {
	ApplicationCommandFlags,
	Bot,
	ButtonComponent,
	ButtonStyles,
	Channel,
	ChannelTypes,
	editOriginalInteractionResponse,
	Embed,
	EventHandlers,
	getGuildIconURL,
	Guild,
	Interaction,
	InteractionDataOption,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponents,
	MessageComponentTypes,
	sendInteractionResponse,
	User,
} from 'discordeno';
import * as Snowflake from 'snowflake';
import { localise, Misc } from 'logos/assets/localisations/mod.ts';
import { addCollector, Client } from 'logos/src/client.ts';
import configuration from 'logos/configuration.ts';
import { code } from 'logos/formatting.ts';

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

/**
 * Taking a guild and the name of a channel, finds the channel with that name
 * and returns it.
 *
 * @param guild - The guild whose channels to look through.
 * @param name - The name of the channel to find.
 * @returns The found channel.
 */
function getTextChannel(
	guild: Guild,
	name: string,
): Channel | undefined {
	const nameAsLowercase = name.toLowerCase();

	const textChannels = guild.channels.array().filter((channel) => channel.type === ChannelTypes.GuildText);

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
 * Paginates an array of elements, allowing the user to browse between pages
 * in an embed view.
 */
function paginate<T>(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	{
		elements,
		embed,
		view,
		show,
	}: {
		elements: T[];
		embed: Omit<Embed, 'footer'>;
		view: PaginationDisplayData<T>;
		show: boolean;
	},
): void {
	const data: PaginationData<T> = { elements, view, pageIndex: 0 };

	const isFirst = () => data.pageIndex === 0;
	const isLast = () => data.pageIndex === data.elements.length - 1;

	const customId = createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		doesNotExpire: true,
		onCollect: (bot, selection) => {
			if (selection.data === undefined) return;

			const action = selection.data.customId!.split('|')[1]!;

			switch (action) {
				case 'PREVIOUS':
					if (!isFirst) data.pageIndex--;
					break;
				case 'NEXT':
					if (!isLast) data.pageIndex++;
					break;
			}

			sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			});

			editOriginalInteractionResponse(bot, interaction.token, {
				embeds: [getPageEmbed(data, embed, isLast(), interaction.locale)],
				components: generateButtons(customId, isFirst(), isLast()),
			});
		},
	});

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: [getPageEmbed(data, embed, data.pageIndex === data.elements.length - 1, interaction.locale)],
				components: generateButtons(customId, isFirst(), isLast()),
			},
		},
	);
}

interface PaginationDisplayData<T> {
	readonly title: string;
	readonly generate: (element: T, index: number) => string;
}

interface PaginationData<T> {
	readonly elements: T[];
	readonly view: PaginationDisplayData<T>;

	pageIndex: number;
}

function getPageEmbed<T>(data: PaginationData<T>, embed: Embed, isLast: boolean, locale: string | undefined): Embed {
	return {
		...embed,
		fields: [
			{
				name: data.elements.length === 1
					? data.view.title
					: `${data.view.title} ~ Page ${data.pageIndex + 1}/${data.elements.length}`,
				value: data.view.generate(data.elements.at(data.pageIndex)!, data.pageIndex),
			},
			...(embed.fields ?? []),
		],
		footer: isLast ? undefined : { text: localise(Misc.continuedOnNextPage, locale) },
	};
}

function generateButtons(customId: string, isFirst: boolean, isLast: boolean): MessageComponents {
	const buttons: ButtonComponent[] = [];

	if (!isFirst) {
		buttons.push({
			type: MessageComponentTypes.Button,
			customId: `${customId}|PREVIOUS`,
			style: ButtonStyles.Secondary,
			label: '«',
		});
	}

	if (!isLast) {
		buttons.push({
			type: MessageComponentTypes.Button,
			customId: `${customId}|NEXT`,
			style: ButtonStyles.Secondary,
			label: '»',
		});
	}

	// @ts-ignore: It is guaranteed that there will be fewer or as many as 5 buttons.
	return buttons.length === 0 ? [] : [{
		type: MessageComponentTypes.ActionRow,
		components: buttons,
	}];
}

/** Settings for interaction collection. */
interface InteractionCollectorSettings {
	/** The type of interaction to listen for. */
	type: InteractionTypes;

	/**
	 * The accepted respondent to the collector. If unset, any user will be able
	 * to respond.
	 */
	userId?: bigint;

	/** The ID of the interaction to listen for. */
	customId?: string;

	/** Whether this collector is to last forever or not. */
	doesNotExpire?: boolean;

	/** How many interactions to collect before de-initialising. */
	limit?: number;

	onCollect?: (...args: Parameters<EventHandlers['interactionCreate']>) => void;
	onEnd?: () => void;
}

/**
 * Taking a {@link Client} and {@link InteractionCollectorSettings}, creates an
 * interaction collector.
 */
function createInteractionCollector(
	clientWithBot: [Client, Bot],
	settings: InteractionCollectorSettings,
): string {
	const customId = settings.customId ?? Snowflake.generate();

	addCollector(clientWithBot, 'interactionCreate', {
		filter: (_bot, interaction) => compileChecks(interaction, settings, customId).every((condition) => condition),
		limit: settings.limit,
		removeAfter: settings.doesNotExpire ? undefined : configuration.collectors.expiresIn,
		onCollect: settings.onCollect ?? (() => {}),
		onEnd: settings.onEnd ?? (() => {}),
	});

	return customId;
}

function compileChecks(
	interaction: Interaction,
	settings: InteractionCollectorSettings,
	customId: string,
): boolean[] {
	return [
		interaction.type === settings.type,
		interaction.data !== undefined && interaction.data.customId !== undefined &&
		interaction.data.customId.split('|').at(0)! === customId.split('|').at(0)!,
		settings.userId === undefined ? true : interaction.user.id === settings.userId,
	];
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

const stringTrail = '...';
const stringContinued = '(...)';

/**
 * Taking a string, trims it to the desired length and returns it.
 *
 * @param string - The string to trim.
 * @param length - The desired length.
 * @returns The trimmed string.
 */
function trim(string: string, length: number): string {
	if (string.length <= length) return string;

	if (!string.includes(' ')) {
		return string.slice(0, Math.max(length - stringTrail.length)) + stringTrail;
	}

	const slice = string.slice(0, length);
	const indexOfLastSpace = slice.lastIndexOf(' ');
	const gap = slice.length - (indexOfLastSpace + 1);

	return slice.slice(0, slice.length - Math.max(gap, stringContinued.length)) + stringContinued;
}

/**
 * Generates a pseudo-random number.
 *
 * @param max - The maximum value to generate.
 * @returns A pseudo-random number between 0 and {@link max}.
 */
function random(max: number): number {
	return Math.floor(Math.random() * max);
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

function guildAsAuthor(bot: Bot, guild: Guild): Author | undefined {
	const iconURL = getGuildIconURLFormatted(bot, guild);
	if (iconURL === undefined) return undefined;

	return {
		name: guild.name,
		iconUrl: iconURL,
	};
}

type Thumbnail = NonNullable<Embed['thumbnail']>;

function guildAsThumbnail(bot: Bot, guild: Guild): Thumbnail | undefined {
	const iconURL = getGuildIconURLFormatted(bot, guild);
	if (iconURL === undefined) return undefined;

	return { url: iconURL };
}

type CustomTypeIndicators = Record<string, 'number' | 'boolean'>;
type CustomTypeIndicatorsTyped<C extends CustomTypeIndicators> = {
	[key in keyof C]: (C[key] extends 'number' ? number : boolean) | undefined;
};

function parseArguments<
	T extends Record<string, string | undefined>,
	R extends CustomTypeIndicatorsTyped<C> & T,
	C extends Record<string, 'number' | 'boolean'>,
>(
	options: InteractionDataOption[] | undefined,
	customTypes: C,
): [R, InteractionDataOption | undefined] {
	let args: Record<string, unknown> = {};

	let focused: InteractionDataOption | undefined = undefined;
	for (const option of options ?? []) {
		if (option.focused) {
			focused = option;
		}

		if (option.options !== undefined) {
			const [parsedArgs, parsedFocused] = parseArguments(
				option.options,
				customTypes,
			);
			focused = parsedFocused ?? focused;
			args = { ...args, ...parsedArgs };
			continue;
		}

		if (option.value === undefined) {
			args[option.name] = undefined;
			continue;
		}

		switch (customTypes[option.name]) {
			case 'boolean': {
				args[option.name] = <boolean> option.value;
				continue;
			}
			case 'number': {
				args[option.name] = parseInt(<string> option.value);
				continue;
			}
		}

		args[option.name] = <string> option.value;
	}

	return [args as R, focused];
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

export {
	addParametersToURL,
	chunk,
	createInteractionCollector,
	diagnosticMentionUser,
	fromHex,
	getGuildIconURLFormatted,
	getTextChannel,
	guildAsAuthor,
	guildAsThumbnail,
	paginate,
	parseArguments,
	random,
	snowflakeToTimestamp,
	trim,
};
