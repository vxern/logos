import diagnostics from "logos:core/diagnostics";
import * as Lavaclient from "lavaclient";
import { Client } from "logos/client";
import { Collector } from "logos/collectors";
import { GlobalService } from "logos/services/service";

class LavalinkService extends GlobalService {
	readonly node: Lavaclient.Node;

	readonly #_voiceStateUpdates: Collector<"voiceStateUpdate">;
	readonly #_voiceServerUpdates: Collector<"voiceServerUpdate">;

	constructor(client: Client) {
		super(client, { identifier: "LavalinkService" });

		this.node = new Lavaclient.Node({
			connection: {
				host: client.environment.lavalinkHost,
				port: Number(client.environment.lavalinkPort),
				password: client.environment.lavalinkPassword,
			},
			sendGatewayPayload: async (guildIdString, payload) => {
				const guildId = BigInt(guildIdString);

				await this.#_sendGatewayPayload(guildId, payload);
			},
		});
		this.node.setMaxListeners(0);

		this.#_voiceStateUpdates = new Collector<"voiceStateUpdate">();
		this.#_voiceServerUpdates = new Collector<"voiceServerUpdate">();
	}

	async start(): Promise<void> {
		this.#_voiceStateUpdates.onCollect(this.#_handleVoiceStateUpdate.bind(this));
		this.#_voiceServerUpdates.onCollect(this.#_handleVoiceServerUpdate.bind(this));

		await this.client.registerCollector("voiceStateUpdate", this.#_voiceStateUpdates);
		await this.client.registerCollector("voiceServerUpdate", this.#_voiceServerUpdates);

		this.node.on("error", (error) => {
			if (error.message.includes("ECONNREFUSED")) {
				return;
			}

			this.log.error(`The audio node has encountered an error: ${error}`);
		});

		this.node.on("disconnect", async (_) => {
			this.log.warn("Unable to reach audio node. Attempting to reconnect...");

			await new Promise((resolve) => setTimeout(resolve, 5000));

			this.node.connect(this.client.bot.id.toString());
		});

		this.node.on("connect", ({ took: tookMs }) => this.log.info(`Connected to audio node. Time taken: ${tookMs} ms`));

		this.node.connect(this.client.bot.id.toString());
	}

	async stop(): Promise<void> {
		this.node.removeAllListeners();
		for (const player of this.node.players.values()) {
			player.removeAllListeners();
			await player.stop();
			player.disconnect();
			player.playing = false;
			player.connected = false;
			await player.destroy();
		}

		await this.#_voiceStateUpdates.close();
		await this.#_voiceServerUpdates.close();
	}

	async #_sendGatewayPayload(guildId: bigint, payload: Discord.ShardSocketRequest): Promise<void> {
		if (this.client.getMusicService(guildId) === undefined) {
			return;
		}

		const shardId = this.client.entities.guilds.get(guildId)?.shardId;
		if (shardId === undefined) {
			return;
		}

		const shard = this.client.bot.gateway.shards.get(shardId);
		if (shard === undefined) {
			return;
		}

		await shard.send(payload, true);
	}

	async #_handleVoiceStateUpdate(voiceState: Discord.VoiceState): Promise<void> {
		return this.node.handleVoiceUpdate({
			session_id: voiceState.sessionId,
			channel_id: voiceState.channelId !== undefined ? `${voiceState.channelId}` : null,
			guild_id: `${voiceState.guildId}`,
			user_id: `${voiceState.userId}`,
		});
	}

	async #_handleVoiceServerUpdate(voiceServerUpdate: Discord.VoiceServerUpdate): Promise<void> {
		if (voiceServerUpdate.endpoint === undefined) {
			this.log.info(
				`Discarding voice server update for ${diagnostics.display.guild(
					voiceServerUpdate.guildId,
				)}: The endpoint is undefined.`,
			);
			return;
		}

		return this.node.handleVoiceUpdate({
			token: voiceServerUpdate.token,
			endpoint: voiceServerUpdate.endpoint,
			guild_id: `${voiceServerUpdate.guildId}`,
		});
	}
}

export { LavalinkService };
