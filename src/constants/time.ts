const time = Object.freeze({
	second: 1000,
	minute: 1000 * 60,
	hour: 1000 * 60 * 60,
	day: 1000 * 60 * 60 * 24,
	week: 1000 * 60 * 60 * 24 * 7,
	month: 1000 * 60 * 60 * 24 * 30,
	year: 1000 * 60 * 60 * 24 * 365,
} as const);
type TimeUnit = keyof typeof time;

export default time;
export type { TimeUnit };
