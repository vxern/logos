import type { Environment } from "logos:core/loaders/environment";
import type pino from "pino";

class DiscordConnection {
	readonly log: pino.Logger;
	readonly bot: Discord.Bot;

	constructor({
		log,
		environment,
		eventHandlers,
		cacheHandlers,
	}: {
		log: pino.Logger;
		environment: Environment;
		eventHandlers: Partial<Discord.EventHandlers>;
		cacheHandlers: Partial<Discord.Transformers["customizers"]>;
	}) {
		this.log = log.child({ name: "DiscordConnection" });
		this.bot = Discord.createBot({
			token: environment.discordSecret,
			intents:
				Discord.Intents.Guilds |
				Discord.Intents.GuildMembers |
				Discord.Intents.GuildModeration |
				Discord.Intents.GuildVoiceStates |
				Discord.Intents.GuildMessages |
				Discord.Intents.MessageContent,
			events: eventHandlers,
			transformers: {
				customizers: cacheHandlers,
				desiredProperties: constants.properties as unknown as Discord.Transformers["desiredProperties"],
			},
			handlers: {
				// We override the `MESSAGE_UPDATE` handler to prevent Discordeno from discarding message updates when
				// an embed is removed from a message.
				MESSAGE_UPDATE: async (bot, data) => {
					const payload = data.d as Discord.DiscordMessage;
					if (!payload.author) {
						return;
					}

					bot.events.messageUpdate?.(bot.transformers.message(bot, payload));
				},
			},
			loggerFactory: (name) => constants.loggers.discordeno.child({ name: name.toLowerCase() }),
		});
	}

	async open(): Promise<void> {
		this.log.info("Establishing connection with Discord...");

		await this.bot.start();

		this.log.info("A connection with Discord has been established.");
	}

	async close(): Promise<void> {
		this.log.info("Closing connection to Discord...");

		await this.bot.shutdown();

		this.log.info("The connection to Discord has been closed.");
	}
}

export { DiscordConnection };
