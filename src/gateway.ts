import { routes } from "https://raw.githubusercontent.com/discordeno/discordeno/dev/util/routes.ts";
import { createGatewayManager, Intents } from '../deps.ts';
import secrets from '../secrets.ts';
import { rest } from './rest.ts';

const gatewayUrl = `http://localhost:${secrets.core.discord.gateway.port}`;

const gatewayData = await rest.runMethod(
	rest,
	'GET',
	`${rest.customUrl}${routes.GATEWAY_BOT}`,
).then((response) => ({
	url: response.url,
	shards: response.shards,
	sessionStartLimit: {
		total: response.session_start_limit.total,
		remaining: response.session_start_limit.remaining,
		resetAfter: response.session_start_limit.reset_after,
		maxConcurrency: response.session_start_limit.max_concurrency,
	},
}));

const gateway = createGatewayManager({
  spawnShardDelay: 10000,
  totalShards: gatewayData.shards,
	gatewayConfig: {
		intents: Intents.GuildMembers,
		token: secrets.core.discord.secret,
	},
  gatewayBot: {
    url: gatewayUrl,
    shards: gatewayData.shards,
    sessionStartLimit: {
      total: gatewayData.sessionStartLimit.total,
      remaining: gatewayData.sessionStartLimit.remaining,
      resetAfter: gatewayData.sessionStartLimit.resetAfter,
      maxConcurrency: gatewayData.sessionStartLimit.maxConcurrency,
    }
  },
	debug: console.debug,
	handleDiscordPayload: async (shard, data) => {
		await fetch(gatewayUrl, {
			headers: {
				Authorization: secrets.core.discord.gateway.secret,
				'method': 'POST',
				'body': JSON.stringify({
					shardId: shard.id,
					data,
				}),
			},
		}).then((response) => response.text()).catch(() => {});
	},
});

gateway.spawnShards();

export { gateway };
