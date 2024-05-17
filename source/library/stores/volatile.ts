import type { Locale } from "logos:constants/languages";
import type { Environment } from "logos:core/loaders/environment";
import Redis from "ioredis";
import { Logger } from "logos/logger";

interface SentencePair {
	readonly sentenceId: number;
	readonly sentence: string;
	readonly translationId: number;
	readonly translation: string;
}
type SentencePairEncoded = [sentenceId: number, sentence: string, translationId: number, translation: string];

class VolatileStore {
	readonly log: Logger;

	readonly redis: Redis;

	constructor({
		log,
		host,
		port,
		password,
	}: { log: Logger; host: string; port: string; password: string | undefined }) {
		this.log = log;
		this.redis = new Redis({
			host,
			port: Number(port),
			password,
			reconnectOnError: (_) => true,
			lazyConnect: true,
		});
	}

	static tryCreate({ environment }: { environment: Environment }): VolatileStore | undefined {
		const log = Logger.create({ identifier: "Client/VolatileStore", isDebug: environment.isDebug });

		if (environment.redisHost === undefined || environment.redisPort === undefined) {
			log.warn(
				"One of `REDIS_HOST` or `REDIS_PORT` have not been provided. Logos will run without a Redis integration.",
			);
			return undefined;
		}

		return new VolatileStore({
			log,
			host: environment.redisHost,
			port: environment.redisPort,
			password: environment.redisPassword,
		});
	}

	async setup(): Promise<void> {
		this.log.info("Setting up volatile store...");

		await this.#connect();

		this.log.info("Volatile store set up.");
	}

	teardown(): void {
		this.log.info("Tearing down volatile store...");

		this.#disconnect();

		this.log.info("Volatile store torn down.");
	}

	async #connect(): Promise<void> {
		this.log.info("Connecting to Redis instance...");

		await this.redis.connect();

		this.log.info("Connected to Redis instance.");
	}

	#disconnect(): void {
		this.log.info("Disconnecting from Redis instance...");

		this.redis.disconnect();

		this.log.info("Disconnected from Redis instance...");
	}

	getSentencePairCount({ learningLocale }: { learningLocale: Locale }): Promise<number> {
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

export { VolatileStore };
export type { SentencePair };
