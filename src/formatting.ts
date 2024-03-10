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

type TimestampFormat =
	| "short-time"
	| "long-time"
	| "short-date"
	| "long-date"
	| "short-datetime"
	| "long-datetime"
	| "relative";

const _timestampFormatToSigil = Object.freeze({
	"short-time": "t",
	"long-time": "T",
	"short-date": "d",
	"long-date": "D",
	"short-datetime": "f",
	"long-datetime": "F",
	relative: "R",
} as const satisfies Record<TimestampFormat, string>);

/**
 * Taking a unix timestamp, returns a formatted, human-readable time expression.
 *
 * @param timestamp - Unix timestamp.
 * @param format - The format to use for displaying the timestamp.
 * @returns The formatted, human-readable time expression.
 */
function timestamp(timestamp: number, { format }: { format: TimestampFormat }): string {
	const timestampSeconds = Math.floor(timestamp / 1000);
	const formatSigil = _timestampFormatToSigil[format];
	return `<t:${timestampSeconds}:${formatSigil}>`;
}

type MentionType = "channel" | "role" | "user";

const _mentionTypeToSigil = Object.freeze({
	channel: "#",
	role: "@&",
	user: "@",
} as const satisfies Record<MentionType, string>);

/**
 * Creates a Discord mention by formatting an ID using the appropriate symbol.
 *
 * @param id - The object to mention by ID.
 * @param type - What the mention mentions.
 * @returns The formatted string of text.
 */
function mention(id: bigint | string, { type }: { type: MentionType }): string {
	const typeSigil = _mentionTypeToSigil[type];
	return `<${typeSigil}${id}>`;
}

// TODO(vxern): What does this function do with multiple whitespaces?
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
		trimmed = trimmed.slice(0, indexOfLastSpace);
	}

	return `${trimmed} ${constants.special.strings.continued}`;
}

export { capitalise, decapitalise, code, codeMultiline, list, mention, timestamp, trim };
