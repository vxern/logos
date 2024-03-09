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

type ElementResultTuple<ElementType, ResultType> = {
	element: ElementType;
	result?: ResultType;
};
async function* asStream<ElementType, ResultType>(
	elements: ElementType[],
	action: (element: ElementType) => Promise<ResultType | undefined>,
): AsyncGenerator<ElementResultTuple<ElementType, ResultType>, void, void> {
	const promises: Promise<ElementResultTuple<ElementType, ResultType>>[] = [];
	const resolvers: ((_: ElementResultTuple<ElementType, ResultType>) => void)[] = [];
	const getResolver = () => resolvers.shift() ?? (() => {});

	for (const _ of Array(elements.length).keys()) {
		promises.push(new Promise((resolve) => resolvers.push(resolve)));
	}

	for (const element of elements) {
		action(element).then((result) => {
			const yieldResult = getResolver();

			if (result === undefined) {
				yieldResult({ element });
			} else {
				yieldResult({ element, result });
			}
		});
	}

	for (const promise of promises) {
		yield promise;
	}
}

function isDefined<T>(element: T | undefined): element is T {
	return element !== undefined;
}

export { toChunked, chunk, reverseObject, asStream, isDefined };
