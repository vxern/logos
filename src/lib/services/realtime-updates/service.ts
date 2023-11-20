import * as Discord from "@discordeno/bot";
import * as ravendb from "ravendb";
import { Client, handleGuildCreate, handleGuildDelete } from "../../client";
import { Guild } from "../../database/guild";
import diagnostics from "../../diagnostics";
import { GlobalService } from "../service";

class RealtimeUpdateService extends GlobalService {
	changes: ravendb.IDatabaseChanges | undefined;

	constructor([client, bot]: [Client, Discord.Bot]) {
		super([client, bot]);
	}

	async start(): Promise<void> {
		this.client.log.info("Streaming updates to guild documents...");

		const changes = this.client.database.changes();
		const streamSubscription = changes.forDocumentsInCollection("Guilds");

		streamSubscription.on("data", async (data) => {
			const guildId = data.id.split("/").at(-1);
			if (guildId === undefined) {
				return;
			}

			const guild = this.client.cache.guilds.get(BigInt(guildId));
			if (guild === undefined) {
				return;
			}

			const oldGuildDocument = this.client.cache.documents.guilds.get(guildId);
			if (oldGuildDocument === undefined) {
				return;
			}

			this.client.log.info(`Detected update to configuration for ${diagnostics.display.guild(guild)}. Updating...`);

			const session = this.client.database.openSession();

			await session.advanced.refresh(oldGuildDocument);

			const guildDocument = await session.load<Guild>(data.id).then((value) => value ?? undefined);

			session.dispose();

			if (guildDocument === undefined) {
				return;
			}

			this.client.cache.documents.guilds.set(guildDocument.guildId, guildDocument);

			await handleGuildDelete(this.client, guild.id);
			await handleGuildCreate([this.client, this.bot], guild, { isUpdate: true });
		});

		streamSubscription.on("error", (error) => {
			this.client.log.info(`Guild document stream closed: ${error}`);
			this.client.log.info("Reopening in 10 seconds...");

			changes.dispose();

			setTimeout(() => this.start(), 10_000);
		});

		this.changes = changes;
	}

	async stop(): Promise<void> {
		this.changes?.dispose();
	}
}

export { RealtimeUpdateService };
