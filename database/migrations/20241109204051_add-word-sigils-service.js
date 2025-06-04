import { migrateDocuments } from "../helpers.js";

async function up(database) {
	await migrateDocuments(database, {
		collection: "Guilds",
		migrate: async (document) => {
			document.enabledFeatures.wordSigils = document.enabledFeatures.word;
		},
	});
}

async function down(_) {}

export { up, down };
