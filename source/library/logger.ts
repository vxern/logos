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

	#_formatMessage(pieces: unknown[]): string {
		const piecesFormatted = pieces
			.map((piece) => {
				if (typeof piece === "object") {
					if (piece !== null && "stack" in piece) {
						return piece.stack;
					}

					return JSON.stringify(piece);
				}

				return piece;
			})
			.join(" ");

		return `${this.#identifierDisplayed} ${piecesFormatted}`;
	}

	debug(...pieces: unknown[]): void {
		if (!this.#isDebug) {
			return;
		}

		winston.debug(this.#_formatMessage(pieces));
	}

	info(...pieces: unknown[]): void {
		winston.info(this.#_formatMessage(pieces));
	}

	warn(...pieces: unknown[]): void {
		winston.warn(this.#_formatMessage(pieces));
	}

	error(...pieces: unknown[]): void {
		winston.error(this.#_formatMessage(pieces));
	}
}

export { Logger };
