import { migrateDocuments, renameProperty } from "../helpers.js";

async function up(database) {
	await migrateDocuments(database, {
		collection: "EntryRequests",
		migrate: async (document) => {
			renameProperty(document, { from: "isFinalised", to: "isResolved" });
		},
	});
}

async function down(_) {}

export { up, down };
