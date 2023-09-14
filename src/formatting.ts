import constants from "./constants/constants";

/**
 * Capitalises the first letter of the given text.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function capitalise(target: string): string {
	const [first, ...rest] = target;
	if (first === undefined) {
		return target;
	}

	return first.toUpperCase() + rest.join("");
}

/**
 * Modifies a string of text to appear within Discord as an embedded code block.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function code(target: string): string {
	return `\`${target}\``;
}

/**
 * Modifies a string of text to appear within Discord as a multi-line code block
 * which expands to fill up entire rows and columns within a text box.
 *
 * @param target - String of text to format.
 */
function codeMultiline(target: string): string {
	return `\`\`\`${target}\`\`\``;
}

/**
 * Taking a list of items, puts them in a list format.
 *
 * @param items - Items in the list.
 * @returns The formatted string of text.
 */
function list(items: string[]): string {
	return items.map((item) => `${constants.symbols.bullet} ${item}`).join("\n");
}

enum TimestampFormat {
	ShortTime = "t",
	LongTime = "T",
	ShortDate = "d",
	LongDate = "D",
	ShortDateTime = "f",
	LongDateTime = "F",
	Relative = "R",
}

/**
 * Taking a unix timestamp, returns a formatted, human-readable time expression.
 *
 * @param timestamp - Unix timestamp.
 * @param format - The format to use for displaying the timestamp.
 * @returns The formatted, human-readable time expression.
 */
function timestamp(timestamp: number, format = TimestampFormat.Relative): string {
	return `<t:${Math.floor(timestamp / 1000)}:${format}>`;
}

/** Defines the type of Discord mention. */
enum MentionTypes {
	Channel = "#",
	Role = "@&",
	User = "@",
}

/**
 * Creates a Discord mention by formatting an ID using the appropriate symbol.
 *
 * @param id - The object to mention by ID.
 * @param type - What the mention mentions.
 * @returns The formatted string of text.
 */
function mention(id: bigint, type: MentionTypes): string {
	return `<${type}${id}>`;
}

/**
 * Taking a string, trims it to the desired length and returns it.
 *
 * @param string - The string to trim.
 * @param length - The desired length.
 * @returns The trimmed string.
 */
function trim(string: string, length: number): string {
	if (string.length <= length) {
		return string;
	}

	if (!string.includes(" ")) {
		return string.slice(0, Math.max(length - constants.symbols.strings.trail.length)) + constants.symbols.strings.trail;
	}

	const slice = string.slice(0, length);
	const indexOfLastSpace = slice.lastIndexOf(" ");
	const gap = slice.length - (indexOfLastSpace + 1);

	return (
		slice.slice(0, slice.length - Math.max(gap, constants.symbols.strings.continued.length)) +
		constants.symbols.strings.continued
	);
}

function withTextStylingDisabled(string: string): string {
	return string.replaceAll("*", "\\*").replaceAll("_", "\\_").replaceAll("~", "\\~");
}

export {
	capitalise,
	code,
	codeMultiline,
	list,
	mention,
	MentionTypes,
	timestamp,
	TimestampFormat,
	trim,
	withTextStylingDisabled,
};
