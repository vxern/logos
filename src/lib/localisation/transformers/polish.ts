function pluralise(quantity: string, { one, two, many }: Record<string, string> = {}): string {
	// 1 is the only positive number the singular form goes with in Polish.
	if (quantity === "1") {
		return `${quantity} ${one}`;
	}

	// Numbers 12, 13 and 14 and other numbers ending in them are followed by the plural genitive.
	if (["12", "13", "14"].some((digits) => quantity.endsWith(digits))) {
		return `${quantity} ${many}`;
	}

	// Numbers ending in 2, 3 and 4
	if (["2", "3", "4"].some((digit) => quantity.endsWith(digit))) {
		return `${quantity} ${two}`;
	}

	return `${quantity} ${many}`;
}

export { pluralise };
export default { pluralise };
