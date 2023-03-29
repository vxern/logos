function pluralise(quantity: number, { one, two }: Record<string, unknown> = {}): string {
	if (quantity === 1) return `${quantity} ${one}`;

	return `${quantity} ${two}`;
}

export { pluralise };
export default { pluralise };
