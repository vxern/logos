import { Locale } from "logos:constants/languages";
import Redis from "ioredis";
import { Environment } from "logos/client";
import { Logger } from "logos/logger";

interface SentencePair {
	readonly sentenceId: number;
	readonly sentence: string;
	readonly translationId: number;
	readonly translation: string;
}
type SentencePairEncoded = [sentenceId: number, sentence: string, translationId: number, translation: string];

class Cache {
	readonly isBootstrapped: boolean;

	readonly #log: Logger;

	readonly #_redis?: Redis;

	get redis(): Redis {
		return this.#_redis!;
	}

	constructor({ environment }: { environment: Environment }) {
		this.#log = Logger.create({ identifier: "Client/DatabaseStore", isDebug: environment.isDebug });

		if (environment.redisHost === undefined || environment.redisPort === undefined) {
			this.#log.warn(
				"One of `REDIS_HOST` or `REDIS_PORT` have not been provided. Logos will run without a Redis integration.",
			);
			this.isBootstrapped = false;
			return;
		}

		this.#_redis = new Redis({
			host: environment.redisHost,
			port: Number(environment.redisPort),
			password: environment.redisPassword,
			reconnectOnError: (_) => true,
			lazyConnect: true,
		});
		this.isBootstrapped = true;
	}

	async start(): Promise<void> {
		if (!this.isBootstrapped) {
			return;
		}

		await this.redis.connect();
	}

	stop(): void {
		if (!this.isBootstrapped) {
			return;
		}

		this.redis.disconnect();
	}

	async getSentencePairCount({ learningLocale }: { learningLocale: Locale }): Promise<number> {
		return this.redis.scard(`${learningLocale}:index`);
	}

	async getRandomSentencePairs({
		learningLocale,
		count,
	}: { learningLocale: Locale; count: number }): Promise<SentencePair[]> {
		const pipeline = this.redis.pipeline();
		for (const _ of Array(count).keys()) {
			pipeline.srandmember(`${learningLocale}:index`);
		}

		const results = await pipeline.exec();
		if (results === null) {
			throw "StateError: Failed to get random indexes for sentence pairs.";
		}

		const ids: string[] = [];
		for (const [error, id] of results) {
			if (error !== null || id === null) {
				throw `StateError: Failed to get random index for sentence pair: ${id}`;
			}

			ids.push(id as string);
		}

		const encodedPairs: SentencePairEncoded[] = [];
		for (const id of ids) {
			const pairEncoded = await this.redis.get(`${learningLocale}:${id}`);
			if (pairEncoded === null) {
				throw `StateError: Failed to get sentence pair for locale ${learningLocale} and index ${id}.`;
			}

			encodedPairs.push(JSON.parse(pairEncoded) as SentencePairEncoded);
		}

		return encodedPairs.map(([sentenceId, sentence, translationId, translation]) => ({
			sentenceId,
			sentence,
			translationId,
			translation,
		}));
	}
}

export { Cache };
export type { SentencePair };
