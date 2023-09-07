function pluralise(
	quantity: string,
	{ one: singular, two: pluralNominative, many: pluralGenitive }: Record<string, string> = {},
): string | undefined {
	if (singular === undefined || pluralNominative === undefined || pluralGenitive === undefined) {
		return undefined;
	}

	if (quantity === "1" || quantity === "-1") {
		return singular;
	}

	// Numbers 12, 13 and 14 and other numbers ending in them are followed by the plural genitive.
	if (["12", "13", "14"].some((digits) => quantity.endsWith(digits))) {
		return pluralGenitive;
	}

	// Numbers ending in 2, 3 and 4.
	if (["2", "3", "4"].some((digit) => quantity.endsWith(digit))) {
		return pluralNominative;
	}

	return pluralGenitive;
}

export default { pluralise };
