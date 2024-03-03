import log from "loglevel";

class Logger {
	static readonly #_instances = new Map<string, Logger>();

	readonly #identifierDisplayed: string;
	readonly #isDebug: boolean;

	private constructor({ identifier, isDebug = false }: { identifier: string; isDebug?: boolean }) {
		this.#identifierDisplayed = `[${identifier}]`;
		this.#isDebug = isDebug;
	}

	static create({ identifier, isDebug = false }: { identifier: string; isDebug?: boolean }): Logger {
		if (Logger.#_instances.has(identifier)) {
			return Logger.#_instances.get(identifier)!;
		}

		return new Logger({ identifier, isDebug });
	}

	debug(...args: unknown[]) {
		this.#isDebug && log.info(this.#identifierDisplayed, ...args);
	}

	info(...args: unknown[]) {
		log.info(this.#identifierDisplayed, ...args);
	}

	error(...args: unknown[]) {
		log.error(this.#identifierDisplayed, ...args);
	}

	warn(...args: unknown[]) {
		log.warn(this.#identifierDisplayed, ...args);
	}
}

export { Logger };
