function pluralise(quantity: string, { one }: Record<string, string> = {}): string {
	return `${quantity} ${one}`;
}

export { pluralise };
export default { pluralise };
