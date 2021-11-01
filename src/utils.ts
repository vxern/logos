/**
 * Makes one or more properties of `T` optional.
 *
 * @typeParam T - The type whose property to make partial.
 * @param K - The property to make partial.
 */
type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type { Optional };
