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
 * Makes the first letter of the given text lowercase, opposite of capitalising.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function decapitalise(target: string): string {
	const [first, ...rest] = target;
	if (first === undefined) {
		return target;
	}

	return first.toLowerCase() + rest.join("");
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
 * Taking a list of items, formats them as a Discord list.
 *
 * @param items - Items in the list.
 * @returns The formatted string of text.
 */
function list(items: string[]): string {
	return items.map((item) => `${constants.symbols.bullet} ${item}`).join("\n");
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
		return `${string.slice(0, -3)} ${constants.symbols.strings.trail}`;
	}

	// Keep trying to make space for the continuation indicator until successful.
	let trimmed = string.slice(0, length);
	while (length - trimmed.length < constants.symbols.strings.continued.length + 1) {
		const indexOfLastSpace = trimmed.lastIndexOf(" ");
		trimmed = trimmed.slice(0, indexOfLastSpace);
	}

	return `${trimmed} ${constants.symbols.strings.continued}`;
}

export { capitalise, decapitalise, code, codeMultiline, list, mention, timestamp, trim };
