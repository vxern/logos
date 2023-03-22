function pluralise(quantity: number, { one, two }: Record<string, unknown> = {}): string {
	// 1 is the only positive number the singular form goes with in Romanian.
	if (quantity === 1) return `${quantity} ${one}`;

	// Until the number 20, Romanian nouns follow the standard number + plural rule.
	if (quantity < 20) return `${quantity} ${two}`;

	// Once the number reaches 20, Romanian begins slotting a 'de' between the number and the plural form of the word.
	return `${quantity} de ${two}`;
}

export { pluralise };
export default { pluralise };
