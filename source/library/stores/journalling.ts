import { getLocaleByLocalisationLanguage } from "logos:constants/languages";
import type { Client } from "logos/client";
import { Collector } from "logos/collectors";
import { Logger } from "logos/logger";
import loggers from "logos/stores/journalling/loggers";

class JournallingStore {
	readonly log: Logger;

	readonly #client: Client;
	readonly #guildBanAddCollector: Collector<"guildBanAdd">;
	readonly #guildBanRemoveCollector: Collector<"guildBanRemove">;
	readonly #guildMemberAddCollector: Collector<"guildMemberAdd">;
	readonly #guildMemberRemoveCollector: Collector<"guildMemberRemove">;
	readonly #messageDeleteCollector: Collector<"messageDelete">;
	readonly #messageUpdateCollector: Collector<"messageUpdate">;

	constructor(client: Client) {
		this.log = Logger.create({ identifier: "JournallingStore", isDebug: client.environment.isDebug });

		this.#client = client;
		this.#guildBanAddCollector = new Collector();
		this.#guildBanRemoveCollector = new Collector();
		this.#guildMemberAddCollector = new Collector();
		this.#guildMemberRemoveCollector = new Collector();
		this.#messageDeleteCollector = new Collector();
		this.#messageUpdateCollector = new Collector();
	}

	async setup(): Promise<void> {
		this.log.info("Setting up journalling store...");

		this.#guildBanAddCollector.onCollect((user, guildId) =>
			this.tryLog("guildBanAdd", { guildId, args: [user, guildId] }),
		);
		this.#guildBanRemoveCollector.onCollect((user, guildId) =>
			this.tryLog("guildBanRemove", { guildId, args: [user, guildId] }),
		);
		this.#guildMemberAddCollector.onCollect((member, user) =>
			this.tryLog("guildMemberAdd", { guildId: member.guildId, args: [member, user] }),
		);
		this.#guildMemberRemoveCollector.onCollect((user, guildId) =>
			this.tryLog("guildMemberRemove", { guildId, args: [user, guildId] }),
		);
		this.#messageDeleteCollector.onCollect((payload, message) => {
			const guildId = payload.guildId;
			if (guildId === undefined) {
				return;
			}

			this.tryLog("messageDelete", { guildId, args: [payload, message] });
		});
		this.#messageUpdateCollector.onCollect((message, oldMessage) => {
			const guildId = message.guildId;
			if (guildId === undefined) {
				return;
			}

			this.tryLog("messageUpdate", { guildId, args: [message, oldMessage] });
		});

		await this.#client.registerCollector("guildBanAdd", this.#guildBanAddCollector);
		await this.#client.registerCollector("guildBanRemove", this.#guildBanRemoveCollector);
		await this.#client.registerCollector("guildMemberAdd", this.#guildMemberAddCollector);
		await this.#client.registerCollector("guildMemberRemove", this.#guildMemberRemoveCollector);
		await this.#client.registerCollector("messageDelete", this.#messageDeleteCollector);
		await this.#client.registerCollector("messageUpdate", this.#messageUpdateCollector);

		this.log.info("Journalling store set up.");
	}

	teardown(): void {
		this.log.info("Tearing down journalling store...");

		this.#guildBanAddCollector.close();
		this.#guildBanRemoveCollector.close();
		this.#guildMemberAddCollector.close();
		this.#guildMemberRemoveCollector.close();
		this.#messageDeleteCollector.close();
		this.#messageUpdateCollector.close();

		this.log.info("Journalling store torn down.");
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

		await this.#client.bot.helpers
			.sendMessage(channelId, message)
			.catch((reason) =>
				this.log.warn(`Failed to log '${event}' event on ${this.#client.diagnostics.guild(guildId)}:`, reason),
			);
	}
}

export { JournallingStore };
