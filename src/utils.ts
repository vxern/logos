import {
	_,
	ApplicationCommand,
	ApplicationCommandInteraction,
	ApplicationCommandOption,
	Guild,
	GuildChannel,
	GuildTextChannel,
	Invite,
	User,
} from '../deps.ts';
import languages from 'https://deno.land/x/language@v0.1.0/languages.ts';
import { Command } from './commands/command.ts';
import { Option } from './commands/option.ts';
import { code } from './formatting.ts';

/**
 * Makes one or more properties of `T` optional.
 *
 * @typeParam T - The type whose property to make partial.
 * @param K - The property to make partial.
 */
type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

/**
 * Compares two command or option objects to determine which keys one or the
 * other is missing.
 *
 * @param left - The Harmony object.
 * @param right - The source object.
 * @returns An array of keys which differ between the objects.
 */
function getMissingKeys(
	left: ApplicationCommand | ApplicationCommandOption,
	right: Command | Option,
): string[];
function getMissingKeys<
	L extends ApplicationCommand | ApplicationCommandOption,
	R extends Partial<L>,
>(
	left: L,
	right: R,
): string[] {
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	const keysToIgnore = [
		...leftKeys.filter((leftKey) => !rightKeys.includes(leftKey)),
		...rightKeys.filter((rightKey) =>
			!leftKeys.includes(rightKey) && rightKey !== 'options'
		),
	];

	const unequalKeys = _.reduce(
		right,
		(result: string[], value: unknown, key: keyof L) => {
			return _.isEqual(value, left[key])
				? result
				: result.concat(key.toString());
		},
		[],
	) as string[];

	const missingKeys = unequalKeys.filter((unequalKey) =>
		!keysToIgnore.includes(unequalKey)
	);

	return missingKeys;
}

/**
 * Finds a channel within a guild by its name.
 *
 * @param guild - The guild where to find the channel.
 * @param name - The name of the channel.
 * @returns The channel or `undefined` if not found.
 */
async function findChannelByName(
	guild: Guild,
	name: string,
): Promise<GuildChannel | undefined> {
	const channels = await guild.channels.array();
	return channels.find((channel) => channel.name.includes(name));
}

/**
 * Gets the most viable invite link to a guild.
 *
 * @param guild - The guild to which the invite link to find.
 * @returns The invite link.
 */
async function getInvite(guild: Guild): Promise<Invite> {
	const invites = await guild.invites.fetchAll();
	return invites.find((invite) =>
		invite.inviter?.id === guild.ownerID! &&
		invite.maxAge === 0
	) ??
		await guild.invites.create(
			(await findChannelByName(guild, 'welcome'))!.id,
			{ maxAge: 0, maxUses: 0, temporary: false },
		);
}

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
 * Returns a language from its ISO-693-1 language code.
 *
 * @param languageCode - The ISO-693-1 language code of a language.
 * @returns The language.
 */
function getLanguage(languageCode: string): string {
	return Object.entries(languages.lang).find(([key, _]) =>
		key === languageCode
	)![1][0];
}

/**
 * Returns the ISO-693-1 language code of a language.
 *
 * @param language - The language whose code to return.
 * @returns ISO-693-1 language code.
 */
function getLanguageCode(language: string): string {
	return Object.entries(languages.lang).find(([_, [name]]) =>
		name.toLowerCase() === language
	)![0];
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
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join('&');

	return `${url}?${query}`;
}

/**
 * Times how long it takes to execute a piece of code, and upon completion, prints a message
 * with the amount of time it took.
 *
 * @param message - The message to send upon completion.
 * @param execution
 */
async function time(
	message: (ms: number) => string,
	execution: () => unknown | Promise<unknown>,
): Promise<void> {
	const then = Date.now();
	await execution();
	const now = Date.now();
	console.log(message(now - then));
}

/**
 * Concatenates a command's name, subcommand group and subcommand into a
 * single string representing the whole command name.
 *
 * @param command - The interaction whose command to display.
 * @returns The full command name.
 */
function displayCommand(command: ApplicationCommandInteraction): string {
	const parts = [command.name, command.subCommandGroup, command.subCommand];

	return parts.filter((part) => part).join(' ');
}

/**
 * Taking a guild and the name of a channel, finds the channel with that name
 * and returns it.
 *
 * @param guild - The guild whose channels to look through.
 * @param name - The name of the channel to find.
 * @returns The found channel.
 */
async function getChannel(
	guild: Guild,
	name: string,
): Promise<GuildTextChannel | undefined> {
	const channels = await guild.channels.array();

	const nameAsLowercase = name.toLowerCase();

	return channels.find((channel) =>
		channel.name.toLowerCase().includes(nameAsLowercase)
	) as
		| GuildTextChannel
		| undefined;
}

/**
 * Taking a user object, creates an informational mention for the user.
 *
 * @param user - The user object.
 * @returns The mention.
 */
function mentionUser(user: User): string {
	return `${code(user.tag)} ~ ${code(user.id)}`;
}

export {
	addParametersToURL,
	displayCommand,
	findChannelByName,
	fromHex,
	getChannel,
	getInvite,
	getLanguage,
	getLanguageCode,
	getMissingKeys,
	mentionUser,
	random,
	time,
};
export type { Optional };
