function pluralise(
	quantity: string,
	{ one: singularNominative, two: singularPartitive }: Record<string, string> = {},
): string | undefined {
	if (singularNominative === undefined || singularPartitive === undefined) {
		return undefined;
	}

	if (quantity === "1") {
		return singularNominative;
	}

	return singularPartitive;
}

export default { pluralise };
