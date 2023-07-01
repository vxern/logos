function pluralise(_: string, { one }: Record<string, string> = {}): string {
	return one ?? "?";
}

export { pluralise };
export default { pluralise };
