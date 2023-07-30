import { LocalService } from "../service";
import * as Discord from "discordeno";
import Fauna from "fauna";
import { Client } from "../../client";
import { Document } from "../../database/document";
import { Guild } from "../../database/structs/guild";
import diagnostics from "../../diagnostics";

type StreamSubscription = Fauna.Subscription<Omit<Fauna.SubscriptionEventHandlers, "snapshot">>;

class RealtimeUpdateService extends LocalService {
	readonly documentReference: Fauna.Expr;
	streamSubscription: StreamSubscription | undefined;

	constructor(client: Client, guildId: bigint, documentReference: Fauna.Expr) {
		super(client, guildId);
		this.documentReference = documentReference;
	}

	async start(bot: Discord.Bot): Promise<void> {
		const guild = this.guild;
		if (guild === undefined) {
			return;
		}

		this.client.database.log.info(`Streaming updates to guild document on ${diagnostics.display.guild(guild)}...`);

		const streamSubscription = this.client.database.client
			.stream(this.documentReference, { fields: ["action", "document"] })
			.on("start", (_) => {})
			.on("version", (data, _) => {
				this.client.database.log.info(`Guild document updated for ${diagnostics.display.guild(guild)}.`);

				const document = data.document as Document<Guild> | undefined;
				if (document === undefined) {
					return;
				}

				this.client.database.cache.guildById.set(document.data.id, document);
			})
			.on("error", (_) => {
				this.client.database.log.info(
					`Guild document stream closed for ${diagnostics.display.guild(guild)}. Reopening in 10 seconds...`,
				);
				streamSubscription.close();
				setTimeout(() => {
					this.client.database.adapters.guilds.fetch(this.client, "id", this.guildIdString);
					this.start(bot);
				}, 10000);
			});
		this.streamSubscription = streamSubscription;
		streamSubscription.start();
	}

	async stop(_: Discord.Bot): Promise<void> {
		this.streamSubscription?.close();
	}
}

export { RealtimeUpdateService };
