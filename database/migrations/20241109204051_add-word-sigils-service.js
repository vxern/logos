import { migrateDocuments } from "database";

// This block is executed when the migration is enacted.
async function up(database) {
	await migrateDocuments(database, {
		collection: "Guilds",
		migrate: async (document) => {
			document.enabledFeatures.wordSigils = document.enabledFeatures.word;
		},
	});
}

// This block is executed when the migration is rolled back.
async function down(_) {
	// No changes to make when rolling back.
}

export { up, down };
