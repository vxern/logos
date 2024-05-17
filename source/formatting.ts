import {
	type MentionType,
	type TimestampFormat,
	getSigilByMentionType,
	getSigilByTimestampFormat,
} from "logos:constants/formatting";

/**
 * Capitalises the first letter of the given text.
 *
 * @param string - String of text to format.
 * @returns The formatted string of text.
 */
function capitalise(string: string): string {
	const [first, ...rest] = string;
	if (first === undefined) {
		return string;
	}

	return first.toUpperCase() + rest.join("");
}

/**
 * Makes the first letter of the given text lowercase, opposite of capitalising.
 *
 * @param string - String of text to format.
 * @returns The formatted string of text.
 */
function decapitalise(string: string): string {
	const [first, ...rest] = string;
	if (first === undefined) {
		return string;
	}

	return first.toLowerCase() + rest.join("");
}

/**
 * Modifies a string of text to appear within Discord as an embedded code block.
 *
 * @param string - String of text to format.
 * @returns The formatted string of text.
 */
function code(string: string): string {
	if (string.length === 0) {
		throw "ArgumentError: The string cannot be empty.";
	}

	return `\`${string}\``;
}

/**
 * Modifies a string of text to appear within Discord as a multi-line code block
 * which expands to fill up entire rows and columns within a text box.
 *
 * @param string - String of text to format.
 */
function codeMultiline(string: string): string {
	if (string.length === 0) {
		throw "ArgumentError: The string cannot be empty.";
	}

	return `\`\`\`${string}\`\`\``;
}

/**
 * Taking a list of items, formats them as a Discord list.
 *
 * @param items - Items in the list.
 * @returns The formatted string of text.
 */
function list(items: string[]): string {
	if (items.length === 0) {
		throw "ArgumentError: The array cannot be empty.";
	}

	return items.map((item) => `${constants.special.bullet} ${item}`).join("\n");
}

/**
 * Taking a unix timestamp, returns a formatted, human-readable time expression.
 *
 * @param timestamp - Unix timestamp.
 * @param format - The format to use for displaying the timestamp.
 * @returns The formatted, human-readable time expression.
 */
function timestamp(timestamp: number, { format }: { format: TimestampFormat }): string {
	const timestampSeconds = Math.floor(timestamp / 1000);
	const sigil = getSigilByTimestampFormat(format);
	return `<t:${timestampSeconds}:${sigil}>`;
}

/**
 * Creates a Discord mention by formatting an ID using the appropriate symbol.
 *
 * @param id - The object to mention by ID.
 * @param type - What the mention mentions.
 * @returns The formatted string of text.
 */
function mention(id: bigint | string, { type }: { type: MentionType }): string {
	const sigil = getSigilByMentionType(type);
	return `<${sigil}${id}>`;
}

/**
 * Taking a string, trims it to the desired length and returns it.
 *
 * @param string - The string to trim.
 * @param length - The desired length.
 * @returns The trimmed string.
 */
function trim(string: string, length: number): string {
	// If the string does not need to be trimmed, return.
	if (string.length <= length) {
		return string;
	}

	// If the string does not have any whitespacing, make the string trail off.
	if (!string.includes(" ")) {
		return `${string.slice(0, length).slice(0, -3)}${constants.special.strings.trail}`;
	}

	// Keep trying to make space for the continuation indicator until successful.
	let trimmed = string.slice(0, length);
	while (length - trimmed.length < constants.special.strings.continued.length + 1) {
		const indexOfLastSpace = trimmed.lastIndexOf(" ");
		trimmed = trimmed.slice(0, indexOfLastSpace).trim();
	}

	return `${trimmed} ${constants.special.strings.continued}`;
}

export { capitalise, decapitalise, code, codeMultiline, list, mention, timestamp, trim };
