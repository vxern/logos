import { Client } from "logos/client";
import { Collector } from "logos/collectors";
import { GlobalService } from "logos/services/service";
import * as shoukaku from "shoukaku";

class ClientConnector extends shoukaku.Connector {
	declare readonly client: Client;

	readonly #nodes: shoukaku.NodeOption[];

	// TODO(vxern): Do not listen to raw events, instead plug in voice state and voice server events into it.
	readonly #_rawEvents: Collector<"raw">;

	constructor(client: Client, { nodes }: { nodes: shoukaku.NodeOption[] }) {
		super(client);

		this.#nodes = nodes;

		this.#_rawEvents = new Collector<"raw">();
	}

	getId(): string {
		return this.client.bot.id.toString();
	}

	listen(_: shoukaku.NodeOption[]): void {}

	sendPacket(shardId: number, payload: Discord.ShardSocketRequest, important: boolean): void {
		const shard = this.client.bot.gateway.shards.get(shardId);
		if (shard === undefined) {
			return;
		}

		// unawaited
		shard.send(payload, important);
	}

	async setup(): Promise<void> {
		this.#_rawEvents.onCollect((payload, _) => this.raw(payload));

		await this.client.registerCollector("raw", this.#_rawEvents);

		this.ready(this.#nodes);
	}

	async teardown(): Promise<void> {
		await this.#_rawEvents.close();
	}
}

class LavalinkService extends GlobalService {
	readonly manager: shoukaku.Shoukaku;

	constructor(client: Client) {
		super(client, { identifier: "LavalinkService" });

		const nodes: shoukaku.NodeOption[] = [
			{
				name: "main",
				url: `${client.environment.lavalinkHost}:${Number(client.environment.lavalinkPort)}`,
				auth: client.environment.lavalinkPassword,
			},
		];
		this.manager = new shoukaku.Shoukaku(new ClientConnector(client, { nodes }), nodes, {
			resume: true,
			resumeTimeout: constants.time.minute / 1000,
			resumeByLibrary: true,
			reconnectTries: -1,
			reconnectInterval: constants.time.minute / 1000,
			restTimeout: (5 * constants.time.second) / 1000,
			userAgent: constants.USER_AGENT,
		});
		this.manager.setMaxListeners(0);
	}

	async start(): Promise<void> {
		this.manager.on("error", (_, error) => {
			if (error.message.includes("ECONNREFUSED")) {
				return;
			}

			this.log.error(`The audio node has encountered an error: ${error}`);
		});

		this.manager.on("ready", (_, reconnected) => {
			if (!reconnected) {
				this.log.info("Connected to audio node.");
			} else {
				this.log.info("Reconnected to audio node.");
			}
		});

		await (this.manager.connector as ClientConnector).setup();
	}

	async stop(): Promise<void> {
		this.manager.removeAllListeners();

		for (const player of Object.values(this.manager.players) as shoukaku.Player[]) {
			await player.destroy();
		}

		await (this.manager.connector as ClientConnector).teardown();
	}
}

export { LavalinkService };
