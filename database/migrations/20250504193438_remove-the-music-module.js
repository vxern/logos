import { migrateDocuments } from "../helpers.js";

async function up(database) {
	await migrateDocuments(database, {
		collection: "Guilds",
		migrate: async (document) => {
			delete document.enabledFeatures?.music;
			delete document.features?.music;
		},
	});
}

async function down(_) {}

export { up, down };
