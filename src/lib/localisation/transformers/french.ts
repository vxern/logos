function pluralise(quantity: string, { one, two }: Record<string, string> = {}): string {
	if (quantity === "0" || quantity === "1") {
		return one ?? "?";
	}

	return two ?? "?";
}

export { pluralise };
export default { pluralise };
