/**
 * Capitalises the first letter of the given text.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function capitalise(target: string): string {
	if (target.length === 0) return target;

	return target.at(0)!.toUpperCase() + target.slice(1);
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

enum BulletStyles {
	Arrow,
	Diamond,
}
const bulletStyles: Required<Record<`${BulletStyles}`, string>> = {
	[BulletStyles.Arrow]: '➜',
	[BulletStyles.Diamond]: '♦️',
};

/**
 * Taking a list of items, puts them in a list format.
 *
 * @param items - Items in the list.
 * @returns The formatted string of text.
 */
function list(items: string[], bulletStyle: BulletStyles = BulletStyles.Arrow): string {
	const bullet = bulletStyles[bulletStyle];
	return items.map((item) => `${bullet} ${item}`).join('\n');
}

/**
 * Taking a unix timestamp, returns a formatted, human-readable time expression.
 *
 * @param timestamp - Unix timestamp.
 * @returns The formatted, human-readable time expression.
 */
function displayTime(timestamp: number): string {
	return `<t:${Math.floor(timestamp / 1000)}:R>`;
}

/** Defines the type of Discord mention. */
enum MentionTypes {
	Channel,
	Role,
	User,
}

/** Defines the formatting prefix corresponding to the type of mention. */
const prefixes: Record<string, string> = {
	[MentionTypes.Channel]: '#',
	[MentionTypes.Role]: '@&',
	[MentionTypes.User]: '@',
};

/**
 * Creates a Discord mention by formatting an ID using the appropriate symbol.
 *
 * @param id - The object to mention by ID.
 * @param type - What the mention mentions.
 * @returns The formatted string of text.
 */
function mention(id: bigint, type: MentionTypes): string {
	return `<${prefixes[type]}${id}>`;
}

export { BulletStyles, capitalise, code, codeMultiline, displayTime, list, mention, MentionTypes };
