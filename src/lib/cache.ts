import Redis from "ioredis";

class Cache {
	readonly redis: Redis;

	constructor() {
		this.redis = new Redis({ lazyConnect: true });
	}

	async start(): Promise<void> {
		await this.redis.connect();
	}

	stop(): void {
		this.redis.disconnect();
	}
}

export { Cache };
