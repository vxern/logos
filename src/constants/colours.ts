import patterns from "./patterns";

/**
 * Parses a 6-digit hex value prefixed with a hashtag to a number.
 *
 * @param colour - The color represented as a 6-digit hexadecimal value prefixed
 * with a hashtag.
 * @returns The decimal form.
 */
function fromHex(colour: string): number {
	if (!patterns.rgbHex.test(colour)) {
		throw "The passed colour was not in the correct format (#ffffff).";
	}

	return parseInt(colour.replace("#", "0x"));
}

export default Object.freeze({
	invisible: fromHex("#36393f"),
	red: fromHex("#b42f2f"),
	darkRed: fromHex("#820000"),
	lightGreen: fromHex("#89ef59"),
	darkGreen: fromHex("#479621"),
	blue: fromHex("#6269ed"),
	dullYellow: fromHex("#f2f277"),
	gray: fromHex("#637373"),
	peach: fromHex("#ff9a76"),
	husky: fromHex("#d6e3f8"),
	murrey: fromHex("#87255b"),
	black: fromHex("#1c1c1c"), // Eerie black
	yellow: fromHex("#ffe548"), // Gargoyle gas
	orangeRed: fromHex("#ff4b3e"), // Dusk orange
	lightGray: fromHex("#daddd8"),
	turquoise: fromHex("#68d8d6"), // Hammam blue
	green: fromHex("#00cc66"), // Alienated
	greenishLightGray: fromHex("#c5e0d8"), // Ulthuan gray
	orange: fromHex("#f28123"), // Beer
} as const);
export { fromHex };
