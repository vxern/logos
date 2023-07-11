function pluralise(_: string, { one: singular }: Record<string, string> = {}): string | undefined {
	if (singular === undefined) {
		return undefined;
	}

	return singular;
}

export default { pluralise };
