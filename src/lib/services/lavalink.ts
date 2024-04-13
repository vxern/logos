import { Client } from "logos/client";
import { Collector } from "logos/collectors";
import { GlobalService } from "logos/services/service";
import * as shoukaku from "shoukaku";

class ClientConnector extends shoukaku.Connector {
	declare readonly client: Client;

	readonly #nodes: shoukaku.NodeOption[];

	readonly #_voiceStateUpdates: Collector<"voiceStateUpdate">;
	readonly #_voiceServerUpdates: Collector<"voiceServerUpdate">;

	constructor(client: Client, { nodes }: { nodes: shoukaku.NodeOption[] }) {
		super(client);

		this.#nodes = nodes;

		this.#_voiceStateUpdates = new Collector<"voiceStateUpdate">();
		this.#_voiceServerUpdates = new Collector<"voiceServerUpdate">();
	}

	/**
	 * @privateRemarks
	 * This method is intentionally not a getter; it conforms to shoukaku's Connector signature.
	 */
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
		this.#_voiceStateUpdates.onCollect((voiceState) =>
			this.manager?.connections.get(voiceState.guildId.toString())?.setStateUpdate({
				session_id: voiceState.sessionId,
				channel_id: voiceState.channelId?.toString(),
				self_deaf: voiceState.toggles.selfDeaf,
				self_mute: voiceState.toggles.selfMute,
			}),
		);
		this.#_voiceServerUpdates.onCollect((voiceServer) =>
			this.manager?.connections.get(voiceServer.guildId.toString())?.setServerUpdate({
				token: voiceServer.token,
				guild_id: voiceServer.guildId.toString(),
				endpoint: voiceServer.endpoint!,
			}),
		);

		await this.client.registerCollector("voiceStateUpdate", this.#_voiceStateUpdates);
		await this.client.registerCollector("voiceServerUpdate", this.#_voiceServerUpdates);

		this.ready(this.#nodes);
	}

	async teardown(): Promise<void> {
		await this.#_voiceStateUpdates.close();
		await this.#_voiceServerUpdates.close();
	}
}

class LavalinkService extends GlobalService {
	readonly connector: ClientConnector;
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

		this.connector = new ClientConnector(client, { nodes });
		this.manager = new shoukaku.Shoukaku(this.connector, nodes, {
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

		await this.connector.setup();
	}

	async stop(): Promise<void> {
		this.manager.removeAllListeners();

		for (const player of Object.values(this.manager.players) as shoukaku.Player[]) {
			await player.destroy();
		}

		await this.connector.teardown();
	}
}

export { LavalinkService };
