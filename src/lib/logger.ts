import winston from "winston";

class Logger {
	static readonly #_instances = new Map<string, Logger>();

	readonly #identifierDisplayed: string;
	readonly #isDebug: boolean;

	private constructor({ identifier, isDebug = false }: { identifier: string; isDebug: boolean | undefined }) {
		this.#identifierDisplayed = `[${identifier}]`;
		this.#isDebug = isDebug;
	}

	static create({ identifier, isDebug = false }: { identifier: string; isDebug: boolean | undefined }): Logger {
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

		winston.debug(`${this.#identifierDisplayed} ${args.join(" ")}`);
	}

	info(...args: unknown[]): void {
		winston.info(`${this.#identifierDisplayed} ${args.join(" ")}`);
	}

	warn(...args: unknown[]): void {
		winston.warn(`${this.#identifierDisplayed} ${args.join(" ")}`);
	}

	error(...args: unknown[]): void {
		winston.error(`${this.#identifierDisplayed} ${args.join(" ")}`);
	}
}

export { Logger };
