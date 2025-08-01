import { migrateDocuments } from "../helpers.js";

// This block is executed when the migration is enacted.
async function up(database) {
	await migrateDocuments(database, {
		collection: "Guilds",
		migrate: async (document) => {
			document.features ??= {};
			document.features.resourceNotices ??= {};
			if (document.resources) {
				document.features.resourceNotices.url = document.resources.url;
			} else {
				document.features.resourceNotices.url = "https://learnromanian.co.uk";
			}
		},
	});
}

// This block is executed when the migration is rolled back.
async function down(_) {
	// No changes to make when rolling back.
}

export { up, down };
