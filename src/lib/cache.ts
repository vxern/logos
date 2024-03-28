import Redis from "ioredis";
import { Client } from "logos/client";

class Cache {
	readonly redis: Redis;

	constructor(client: Client) {
		this.redis = new Redis({
			host: client.environment.redisHost,
			port: client.environment.redisPort !== undefined ? Number(client.environment.redisPort) : undefined,
			password: client.environment.redisPassword,
			reconnectOnError: (_) => true,
			lazyConnect: true,
		});
	}

	async start(): Promise<void> {
		await this.redis.connect();
	}

	stop(): void {
		this.redis.disconnect();
	}
}

export { Cache };
