function pluralise(quantity: string, { one: singular, two: plural }: Record<string, string> = {}): string | undefined {
	if (singular === undefined || plural === undefined) {
		return undefined;
	}

	if (quantity === "1" || quantity === "-1") {
		return singular;
	}

	return plural;
}

export default { pluralise };
