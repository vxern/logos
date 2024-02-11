import * as Discord from "@discordeno/bot";
import * as Lavaclient from "lavaclient";
import { Client } from "../../client";
import diagnostics from "../../diagnostics";
import { GlobalService } from "../service";

class LavalinkService extends GlobalService {
	readonly node: Lavaclient.Node;

	constructor(client: Client) {
		super(client);
		this.node = new Lavaclient.Node({
			connection: {
				host: client.environment.lavalinkHost,
				port: Number(client.environment.lavalinkPort),
				password: client.environment.lavalinkPassword,
			},
			sendGatewayPayload: async (guildIdString, payload) => {
				const guildId = BigInt(guildIdString);
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

				shard.send(payload, true);
			},
		});
		this.node.setMaxListeners(0);
	}

	async start(): Promise<void> {
		this.node.on("error", (error) => {
			if (error.message.includes("ECONNREFUSED")) {
				return;
			}

			this.client.log.error(`The audio node has encountered an error: ${error}`);
		});

		this.node.on("disconnect", async (_) => {
			this.client.log.warn("Unable to reach audio node. Attempting to reconnect...");

			await new Promise((resolve) => setTimeout(resolve, 5000));

			this.node.connect(this.client.bot.id.toString());
		});

		this.node.on("connect", ({ took: tookMs }) =>
			this.client.log.info(`Connected to audio node. Time taken: ${tookMs} ms`),
		);

		return this.node.connect(this.client.bot.id.toString());
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
	}

	async voiceStateUpdate(voiceState: Discord.VoiceState): Promise<void> {
		return this.node.handleVoiceUpdate({
			session_id: voiceState.sessionId,
			channel_id: voiceState.channelId !== undefined ? `${voiceState.channelId}` : null,
			guild_id: `${voiceState.guildId}`,
			user_id: `${voiceState.userId}`,
		});
	}

	async voiceServerUpdate(voiceServerUpdate: Discord.VoiceServerUpdate): Promise<void> {
		if (voiceServerUpdate.endpoint === undefined) {
			this.client.log.info(
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
