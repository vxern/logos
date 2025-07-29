import { deleteProperties, migrateDocuments } from "../helpers.js";

// This block is executed when the migration is enacted.
async function up(database) {
	await migrateDocuments(database, {
		collection: "Guilds",
		migrate: async (document) => {
			deleteProperties(document.enabledFeatures, ["roleNotices", "resourceNotices"]);
			deleteProperties(document.features, ["roleNotices", "resourceNotices"]);
			document.features.informationNotices ??= {};
			document.features.informationNotices.urls ??= {
				website: "https://learnromanian.co.uk",
				discord: "https://learnromanian.co.uk/socials/discord",
				instagram: "https://learnromanian.co.uk/socials/instagram",
				resources: "https://learnromanian.co.uk",
			};
		},
	});
}

// This block is executed when the migration is rolled back.
async function down(_) {
	// No changes to make when rolling back.
}

export { up, down };
