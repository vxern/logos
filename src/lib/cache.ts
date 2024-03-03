import Redis from "ioredis";

class Cache {
	readonly database: Redis;

	constructor() {
		this.database = new Redis();
	}
}

export { Cache };
