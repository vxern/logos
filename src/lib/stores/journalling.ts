import { getLocaleByLocalisationLanguage } from "logos:constants/languages";
import { Client } from "logos/client";
import { Collector } from "logos/collectors";
import { Logger } from "logos/logger";
import loggers from "logos/stores/journalling/loggers";

class JournallingStore {
	readonly #log: Logger;
	readonly #client: Client;

	readonly #_guildBanAddCollector: Collector<"guildBanAdd">;
	readonly #_guildBanRemoveCollector: Collector<"guildBanRemove">;
	readonly #_guildMemberAddCollector: Collector<"guildMemberAdd">;
	readonly #_guildMemberRemoveCollector: Collector<"guildMemberRemove">;
	readonly #_messageDeleteCollector: Collector<"messageDelete">;
	readonly #_messageUpdateCollector: Collector<"messageUpdate">;

	constructor(client: Client) {
		this.#log = Logger.create({ identifier: "JournallingStore", isDebug: client.environment.isDebug });
		this.#client = client;

		this.#_guildBanAddCollector = new Collector();
		this.#_guildBanRemoveCollector = new Collector();
		this.#_guildMemberAddCollector = new Collector();
		this.#_guildMemberRemoveCollector = new Collector();
		this.#_messageDeleteCollector = new Collector();
		this.#_messageUpdateCollector = new Collector();
	}

	async start(): Promise<void> {
		this.#_guildBanAddCollector.onCollect((user, guildId) =>
			this.tryLog("guildBanAdd", { guildId, args: [user, guildId] }),
		);
		this.#_guildBanRemoveCollector.onCollect((user, guildId) =>
			this.tryLog("guildBanRemove", { guildId, args: [user, guildId] }),
		);
		this.#_guildMemberAddCollector.onCollect((member, user) =>
			this.tryLog("guildMemberAdd", { guildId: member.guildId, args: [member, user] }),
		);
		this.#_guildMemberRemoveCollector.onCollect((user, guildId) =>
			this.tryLog("guildMemberRemove", { guildId, args: [user, guildId] }),
		);
		this.#_messageDeleteCollector.onCollect((payload, message) => {
			const guildId = payload.guildId;
			if (guildId === undefined) {
				return;
			}

			this.tryLog("messageDelete", { guildId, args: [payload, message] });
		});
		this.#_messageUpdateCollector.onCollect((message, oldMessage) => {
			const guildId = message.guildId;
			if (guildId === undefined) {
				return;
			}

			this.tryLog("messageUpdate", { guildId, args: [message, oldMessage] });
		});

		await this.#client.registerCollector("guildBanAdd", this.#_guildBanAddCollector);
		await this.#client.registerCollector("guildBanRemove", this.#_guildBanRemoveCollector);
		await this.#client.registerCollector("guildMemberAdd", this.#_guildMemberAddCollector);
		await this.#client.registerCollector("guildMemberRemove", this.#_guildMemberRemoveCollector);
		await this.#client.registerCollector("messageDelete", this.#_messageDeleteCollector);
		await this.#client.registerCollector("messageUpdate", this.#_messageUpdateCollector);
	}

	stop(): void {
		this.#_guildBanAddCollector.close();
		this.#_guildBanRemoveCollector.close();
		this.#_guildMemberAddCollector.close();
		this.#_guildMemberRemoveCollector.close();
		this.#_messageDeleteCollector.close();
		this.#_messageUpdateCollector.close();
	}

	async tryLog<Event extends keyof Events>(
		event: Event,
		{ guildId, journalling, args }: { guildId: bigint; journalling?: boolean | undefined; args: Events[Event] },
	): Promise<void> {
		// If explicitly defined as false, do not log.
		if (journalling === false) {
			this.#client.log.info(
				`Event '${event}' happened on ${this.#client.diagnostics.guild(
					guildId,
				)}, but journalling for that feature is explicitly turned off. Ignoring...`,
			);
			return;
		}

		const guildDocument = this.#client.documents.guilds.get(guildId.toString());
		if (guildDocument === undefined) {
			return;
		}

		const configuration = guildDocument.journalling;
		if (configuration === undefined) {
			return;
		}

		const channelId = BigInt(configuration.channelId);
		if (channelId === undefined) {
			return;
		}

		const generateMessage = loggers[event as keyof typeof loggers];
		if (generateMessage === undefined) {
			return;
		}

		const guildLocale = getLocaleByLocalisationLanguage(guildDocument.localisationLanguage);
		const message = await generateMessage(
			this.#client,
			// @ts-ignore: This is fine.
			args,
			{
				guildLocale,
				featureLanguage: guildDocument.featureLanguage,
			},
		);
		if (message === undefined) {
			return;
		}

		await this.#client.bot.rest
			.sendMessage(channelId, message)
			.catch(() => this.#log.warn(`Failed to log '${event}' event on ${this.#client.diagnostics.guild(guildId)}.`));
	}
}

export { JournallingStore };
