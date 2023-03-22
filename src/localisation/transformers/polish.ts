function pluralise(quantity: number, { one, two, many }: Record<string, unknown> = {}): string {
	const quantityStringified = quantity.toString();

	// 1 is the only positive number the singular form goes with in Polish.
	if (quantityStringified === '1') return `${quantityStringified} ${one}`;

	// Numbers 12, 13 and 14 and other numbers ending in them are followed by the plural genitive.
	if (['12', '13', '14'].some((digits) => quantityStringified.endsWith(digits))) {
		return `${quantityStringified} ${many}`;
	}

	// Numbers ending in 2, 3 and 4
	if (['2', '3', '4'].some((digit) => quantityStringified.endsWith(digit))) return `${quantityStringified} ${two}`;

	return `${quantityStringified} ${many}`;
}

export { pluralise };
export default { pluralise };
