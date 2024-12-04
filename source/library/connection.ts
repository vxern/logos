import type { Environment } from "logos:core/loaders/environment";
import type pino from "pino";

class DiscordConnection {
	readonly log: pino.Logger;
	readonly bot: Discord.Bot;

	constructor({
		log = constants.loggers.silent,
		environment,
		intents = Discord.Intents.Guilds |
			Discord.Intents.GuildMembers |
			Discord.Intents.GuildModeration |
			Discord.Intents.GuildVoiceStates |
			Discord.Intents.GuildMessages |
			Discord.Intents.MessageContent,
		eventHandlers = {},
		cacheHandlers = {},
	}: {
		log?: pino.Logger;
		environment: Environment;
		intents?: Discord.GatewayIntents;
		eventHandlers?: Partial<Discord.EventHandlers>;
		cacheHandlers?: Partial<Discord.Transformers["customizers"]>;
	}) {
		this.log = log.child({ name: "DiscordConnection" });
		this.bot = Discord.createBot({
			token: environment.discordSecret,
			intents,
			events: eventHandlers,
			transformers: { customizers: cacheHandlers },
			desiredProperties: constants.properties,
		});
		this.bot.handlers = Discord.createBotGatewayHandlers({
			// REMINDER(vxern): Remove this once Discordeno is able to filter out embeds being resolved in a message.
			MESSAGE_UPDATE: async (bot, data) => {
				const payload = data.d as Discord.DiscordMessage;
				if (!payload.author) {
					return;
				}

				bot.events.messageUpdate?.(bot.transformers.message(bot, payload));
			},
		});
		this.bot.logger = constants.loggers.discordeno.child({ name: "Bot" });

		this.bot.rest.createBaseHeaders = () => ({ "User-Agent": "Logos (https://github.com/vxern/logos)" });
		// REMINDER(vxern): Remove this once the weird 5 second delay is removed from Discordeno's `shutdown()` call.
		this.bot.gateway.shutdown = async (code, reason) => {
			for (const shard of this.bot.gateway.shards.values()) {
				shard.close(code, reason);
			}
		};
	}

	async open(): Promise<void> {
		this.log.info("Establishing connection with the Discord gateway...");

		await this.bot.start();

		this.log.info("A connection with the Discord gateway has been established.");
	}

	async close(): Promise<void> {
		this.log.info("Closing Discord gateway connection...");

		await this.bot.shutdown();

		this.log.info("The connection with the Discord gateway has been closed.");
	}
}

export { DiscordConnection };
