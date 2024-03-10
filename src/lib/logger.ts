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

		const instance = new Logger({ identifier, isDebug });

		Logger.#_instances.set(identifier, instance);

		return instance;
	}

	debug(...args: unknown[]): void {
		if (!this.#isDebug) {
			return;
		}

		log.debug(this.#identifierDisplayed, ...args);
	}

	info(...args: unknown[]): void {
		log.info(this.#identifierDisplayed, ...args);
	}

	warn(...args: unknown[]): void {
		log.warn(this.#identifierDisplayed, ...args);
	}

	error(...args: unknown[]): void {
		log.error(this.#identifierDisplayed, ...args);
	}
}

export { Logger };
