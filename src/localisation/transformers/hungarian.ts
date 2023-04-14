function pluralise(quantity: number, { one }: Record<string, unknown> = {}): string {
	return `${quantity} ${one}`;
}

export { pluralise };
export default { pluralise };
