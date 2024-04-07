import { Collection } from "logos:constants/database";
import { Client } from "logos/client";
import { Guild } from "logos/database/guild";
import { Model, RawDocument } from "logos/database/model";
import { ActionLock } from "logos/helpers/action-lock";
import { GlobalService } from "logos/services/service";
import { DocumentSession } from "logos/stores/database";
import * as ravendb from "ravendb";

class RealtimeUpdateService extends GlobalService {
	readonly lock: ActionLock;
	readonly changes: ravendb.IDatabaseChanges;
	readonly streamSubscription: ravendb.IChangesObservable<ravendb.DocumentChange>;

	constructor(client: Client) {
		super(client, { identifier: "RealtimeUpdateService" });

		this.lock = new ActionLock();
		this.changes = client.database.changes();
		this.streamSubscription = this.changes.forDocumentsInCollection("Guilds");
	}

	async start(): Promise<void> {
		this.log.info("Streaming updates...");

		this.streamSubscription.on("data", this.#_receiveGuildConfigurationUpdate);
		this.streamSubscription.on("error", this.#_handleError);
	}

	async stop(): Promise<void> {
		await this.lock.dispose();
		this.changes.dispose();

		this.streamSubscription.off("data", this.#_receiveGuildConfigurationUpdate);
		this.streamSubscription.off("error", this.#_handleError);
	}

	#_receiveGuildConfigurationUpdate = async (data: ravendb.DocumentChange): Promise<void> => {
		const [_, [guildId]] = Model.getDataFromId<Guild>(data.id);

		this.log.info(`Detected update to configuration for ${this.client.diagnostics.guild(guildId)}. Queueing update...`);

		await this.lock.doAction(() => this.#_handleUpdateGuildConfiguration(data));
	};

	async #_handleUpdateGuildConfiguration(data: ravendb.DocumentChange): Promise<void> {
		const newGuildDocument = await this.client.database.withSession<Guild>(async (session) => {
			const query = session
				.query({ collection: "Guilds" satisfies Collection })
				.whereEquals("id", data.id)
				.waitForNonStaleResults();
			const rawDocument = (await query.first()) as RawDocument;
			const guildDocument = DocumentSession.instantiateModel<Guild>(rawDocument);

			this.client.database.cacheDocument(guildDocument);

			return guildDocument;
		});

		await this.client.reloadGuild(BigInt(newGuildDocument.guildId));
	}

	#_handleError = (error: Error): void => {
		this.log.info(`Guild document stream closed: ${error}`);
	};
}

export { RealtimeUpdateService };
