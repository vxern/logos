import type { GuildDocument as Previous } from "logos/models/documents/guild/4.48.0";
import type { GuildDocument as Next } from "logos/models/documents/guild/latest";
import type { Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";

// This block is executed when the migration is enacted.
async function up(database: DatabaseStore): Promise<void> {
	const documents = await database.withSession(async (session) => {
		return session.query<Model & Previous>({ collection: "Guilds" }).run();
	});

	for (const previous of documents) {
		const next = previous as Model & Next;
		await next.update(database, async () => {
			next.enabledFeatures.wordSigils = next.enabledFeatures.word;
		});
	}
}

// This block is executed when the migration is rolled back.
async function down(_: DatabaseStore): Promise<void> {
	// No changes to make when rolling back.
}

export { up, down };
