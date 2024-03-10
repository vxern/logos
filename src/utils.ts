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

/**
 * Taking an array, splits it into parts of equal sizes.
 *
 * @param array - The array to chunk.
 * @param size - The size of each chunk.
 * @returns The chunked array.
 */
function toChunked<T>(array: T[], size: number): T[][] {
	return Array.from(chunk(array, size));
}

type Reverse<O extends Record<string, string>> = {
	[K in keyof O as O[K]]: K;
};
function reverseObject<O extends Record<string, string>>(object: O): Reverse<O> {
	const reversed: Partial<Reverse<O>> = {};
	for (const key of Object.keys(object) as (keyof O)[]) {
		// @ts-ignore: This is okay.
		reversed[object[key]] = key;
	}
	return reversed as unknown as Reverse<O>;
}

type ElementResultTuple<T, R> = { element: T; result?: R };
async function* race<T, R>(
	elements: T[],
	doAction: (element: T) => Promise<R | undefined>,
): AsyncGenerator<ElementResultTuple<T, R>, void, void> {
	const promisesWithResolver = elements.map(() => Promise.withResolvers<ElementResultTuple<T, R>>());

	const resolvers = [...promisesWithResolver];
	for (const element of elements) {
		doAction(element).then((result) => {
			const { resolve } = resolvers.shift()!;

			if (result === undefined) {
				resolve({ element });
			} else {
				resolve({ element, result });
			}
		});
	}

	for (const { promise } of promisesWithResolver) {
		yield promise;
	}
}

function isDefined<T>(element: T | undefined): element is T {
	return element !== undefined;
}

export { toChunked, chunk, reverseObject, race, isDefined };
