export {};

declare global {
	interface PromiseConstructor {
		withResolvers<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: () => void };
	}
}
