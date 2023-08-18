import { Client } from "../../client";
import diagnostics from "../../diagnostics";
import { GlobalService } from "../service";
import * as Discord from "@discordeno/bot";
import * as Lavaclient from "lavaclient";

class LavalinkService extends GlobalService {
	readonly node: Lavaclient.Node;

	constructor([client, bot]: [Client, Discord.Bot]) {
		super([client, bot]);
		this.node = new Lavaclient.Node({
			connection: {
				host: client.metadata.environment.lavalinkHost,
				port: Number(client.metadata.environment.lavalinkPort),
				password: client.metadata.environment.lavalinkPassword,
			},
			sendGatewayPayload: async (guildIdString, payload) => {
				const guildId = BigInt(guildIdString);
				if (!this.client.services.music.music.has(guildId)) {
					return;
				}

				const shardId = this.client.cache.guilds.get(guildId)?.shardId;
				if (shardId === undefined) {
					return;
				}

				const shard = bot.gateway.shards.get(shardId);
				if (shard === undefined) {
					return;
				}

				shard.send(payload, true);
			},
		});
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

			this.node.connect(this.bot.id.toString());
		});

		this.node.on("connect", ({ took: tookMs }) =>
			this.client.log.info(`Connected to audio node. Time taken: ${tookMs} ms`),
		);

		return this.node.connect(this.bot.id.toString());
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
