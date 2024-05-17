function* chunk<T>(array: T[], size: number): Generator<T[], void, void> {
	if (array.length === 0) {
		yield [];
		return;
	}

	if (size === 0) {
		throw "ArgumentError: The size of a chunk cannot be zero.";
	}

	const chunks = array.length <= size ? 1 : Math.ceil(array.length / size);
	for (const index of Array(chunks).keys()) {
		const start = index * size;
		const end = start + size;
		yield array.slice(start, end);
	}
}

function isDefined<T>(element: T | undefined): element is T {
	return element !== undefined;
}

export { chunk, isDefined };
