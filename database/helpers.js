async function migrateDocuments(database, { collection, migrate }) {
	const documents = await database.withSession(async (session) => {
		return session.query({ collection }).run();
	});

	for (const document of documents) {
		await document.update(database, async () => migrate(document));
	}
}

function renameProperty(document, { from, to }) {
	document[to] = document[from];
	delete document[from];
}

export { migrateDocuments, renameProperty };
