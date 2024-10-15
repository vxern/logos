import type { Environment } from "logos:core/loaders/environment";
import type pino from "pino";

class DiscordConnection {
	readonly log: pino.Logger;
	readonly bot: Discord.Bot;

	constructor({
		log = constants.loggers.silent,
		environment,
		eventHandlers = {},
		cacheHandlers = {},
	}: {
		log?: pino.Logger;
		environment: Environment;
		eventHandlers?: Partial<Discord.EventHandlers>;
		cacheHandlers?: Partial<Discord.Transformers["customizers"]>;
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
		});
		for (const [customiser, handler] of Object.entries(cacheHandlers)) {
			// @ts-ignore: This will be removed after updating to a new Discordeno release.
			this.bot.transformers.customizers[customiser] = handler;
		}
		this.bot.transformers.desiredProperties =
			constants.properties as unknown as Discord.Transformers["desiredProperties"];
		this.bot.handlers = Discord.createBotGatewayHandlers({
			// We override the `MESSAGE_UPDATE` handler to prevent Discordeno from discarding message updates when
			// an embed is removed from a message.
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
		// REMINDER(vxern): The Discordeno shutdown() method has a weird delay, so we override its definition to
		// remove the delay.
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
