import * as ravendb from "ravendb";
import { Guild } from "../../database/guild";
import diagnostics from "../../diagnostics";
import { GlobalService } from "../service";

type DocumentChangeHandler = (data: ravendb.DocumentChange) => Promise<void>;

// TODO(vxern): This definitely can be improved or somehow extended to other objects.
class RealtimeUpdateService extends GlobalService {
	changes?: ravendb.IDatabaseChanges;
	streamSubscription?: ravendb.IChangesObservable<ravendb.DocumentChange>;

	onUpdateGuildConfiguration?: DocumentChangeHandler;
	onError?: (error: Error) => void;

	isHandlingUpdate = false;
	readonly handlerQueue: (() => Promise<void>)[] = [];

	async start(): Promise<void> {
		this.client.log.info("Streaming updates to guild documents...");

		const changes = this.client.database.changes();
		const streamSubscription = changes.forDocumentsInCollection("Guilds");

		this.onUpdateGuildConfiguration = async (data) => {
			if (this.isHandlingUpdate) {
				this.handlerQueue.push(() => this.handleUpdateGuildConfiguration(data));
			} else {
				this.handleUpdateGuildConfiguration(data);
			}
		};
		this.onError = (error) => {
			this.client.log.info(`Guild document stream closed: ${error}`);
			this.client.log.info("Reopening in 10 seconds...");

			changes.dispose();

			setTimeout(() => this.start(), 10_000);
		};

		streamSubscription.on("data", this.onUpdateGuildConfiguration);
		streamSubscription.on("error", this.onError);

		this.changes = changes;
		this.streamSubscription = streamSubscription;
	}

	async stop(): Promise<void> {
		const [onUpdateGuildConfiguration, onError] = [this.onUpdateGuildConfiguration, this.onError];
		if (onUpdateGuildConfiguration === undefined || onError === undefined) {
			throw "StateError: Tried to stop service before it was started.";
		}

		this.streamSubscription?.off("data", onUpdateGuildConfiguration);
		this.streamSubscription?.off("error", onError);

		this.changes?.dispose();
	}

	async handleUpdateGuildConfiguration(data: ravendb.DocumentChange): Promise<void> {
		this.isHandlingUpdate = true;

		const guildId = data.id.split("/").at(-1);
		if (guildId === undefined) {
			return;
		}

		const guild = this.client.entities.guilds.get(BigInt(guildId));
		if (guild === undefined) {
			return;
		}

		this.client.log.info(`Detected update to configuration for ${diagnostics.display.guild(guild)}. Updating...`);

		const oldGuildDocument = await Guild.get(this.client, { guildId: data.id });

		if (oldGuildDocument === undefined) {
			return;
		}

		await this.client.database.withSession(async (session) => {
			// TODO(vxern): What does this do again?
			await session.advanced.refresh(oldGuildDocument);
		});

		this.client.documents.guilds.set(oldGuildDocument.guildId, oldGuildDocument);

		await this.client.reloadGuild(guild.id);

		const nextHandler = this.handlerQueue.shift();
		if (nextHandler === undefined) {
			this.isHandlingUpdate = false;
			return;
		}

		await nextHandler();
	}
}

export { RealtimeUpdateService };
