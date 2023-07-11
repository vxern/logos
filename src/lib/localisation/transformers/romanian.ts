function pluralise(
	quantity: string,
	{ one: singular, two: pluralSmall, many: pluralLarge }: Record<string, string> = {},
): string | undefined {
	if (singular === undefined || pluralSmall === undefined || pluralLarge === undefined) {
		return undefined;
	}

	// 1 is the only positive number the singular form goes with in Romanian.
	if (quantity === "1") {
		return singular;
	}

	// Until the number 20, Romanian nouns follow the standard number + plural rule.
	if (parseInt(quantity) < 20) {
		return pluralSmall;
	}

	// Once the number reaches 20, Romanian begins slotting a 'de' between the number and the plural form of the word.
	return pluralLarge;
}

export default { pluralise };
