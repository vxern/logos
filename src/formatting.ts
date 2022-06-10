import { dayjs } from '../deps.ts';

/**
 * Modifies a string of text to appear bold within Discord.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function bold(target: string): string {
	return `**${target}**`;
}

/**
 * Capitalises the first letter of the given text.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function capitalise(target: string): string {
	if (target.length === 0) return target;

	return target[0]!.toUpperCase() + target.slice(1);
}

/**
 * Modifies a string of text to appear within Discord as an embedded code block.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function code(target: string): string {
	return '`' + target + '`';
}

/**
 * Modifies a string of text to appear within Discord as a multi-line code block
 * which expands to fill up entire rows and columns within a text box.
 *
 * @param target - String of text to format.
 */
function codeMultiline(target: string): string {
	return '```' + target + '```';
}

/**
 * Modifies a string of text to appear italicised within Discord.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function italic(target: string): string {
	return `*${target}*`;
}

/**
 * Modifies a string of text to appear underlined within Discord.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function underlined(target: string): string {
	return `__${target}__`;
}

/**
 * Taking a list of items, puts them in a list format.
 *
 * @param items - Items in the list.
 * @returns The formatted string of text.
 */
function list(items: string[]): string {
	return items.map((item) => `• ${item}`).join('\n');
}

/**
 * Taking a unix timestamp, returns a formatted, human-readable time expression.
 *
 * @param unix - Unix timestamp.
 * @returns The formatted, human-readable time expression.
 */
function time(unix: number): string {
	const dateTime = dayjs(unix);

	return `${dateTime.format('D MMMM YYYY')} (${dateTime.fromNow()})`;
}

/** Defines the type of Discord mention. */
enum MentionType {
	/** A channel mention. */
	CHANNEL,
	/** A role mention. */
	ROLE,
	/** A user mention. */
	USER,
}

/**
 * Creates a Discord mention by formatting an ID using the appropriate symbol.
 *
 * @param target - The object to mention by ID.
 * @param type - What the mention mentions.
 * @returns The formatted string of text.
 */
function mention(target: string, type: MentionType): string {
	let prefix: string;
	switch (type) {
		case MentionType.CHANNEL:
			prefix = '#';
			break;
		case MentionType.ROLE:
			prefix = '@&';
			break;
		case MentionType.USER:
			prefix = '@';
			break;
	}
	return `<${prefix}${target}>`;
}

export {
	bold,
	capitalise,
	code,
	codeMultiline,
	italic,
	list,
	mention,
	MentionType,
	time,
	underlined,
};
