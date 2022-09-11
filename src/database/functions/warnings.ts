import { faunadb } from '../../../deps.ts';
import { Database, dispatchQuery } from '../database.ts';
import { Document, Reference } from '../structs/document.ts';
import { Warning } from '../structs/users/warning.ts';

const $ = faunadb.query;

/**
 * Fetches warnings from the database.
 *
 * @param user - The user to use for indexing the database.
 * @returns An array of article change documents or undefined.
 */
async function fetchWarnings(
	database: Database,
	user: Reference,
): Promise<Document<Warning>[] | undefined> {
	const documents = await dispatchQuery<Warning[]>(
		database,
		$.Map(
			$.Paginate($.Match($.FaunaIndex('GetWarningsBySubject'), user)),
			$.Lambda('warning', $.Get($.Var('warning'))),
		),
	);

	if (!documents) {
		console.error(`Failed to fetch warnings by user.`);
		return undefined;
	}

	database.warningsBySubject.set(user.value.id, documents);

	return documents;
}

/**
 * Attempts to get user warnings from cache, and if the warnings do not exist,
 * attempts to fetch them from the database.
 *
 * @param user - The reference to the user for indexing the database.
 * @returns The warnings.
 */
async function getWarnings(
	database: Database,
	user: Reference,
): Promise<Document<Warning>[] | undefined> {
	return database.warningsBySubject.get(user.value.id) ??
		await fetchWarnings(database, user);
}

/**
 * Creates a warning document in the database.
 *
 * @param warning - The warning to create.
 * @returns The created warning document.
 */
async function createWarning(
	database: Database,
	warning: Warning,
): Promise<Document<Warning> | undefined> {
	const document = await dispatchQuery<Warning>(
		database,
		$.Create($.Collection('Warnings'), { data: warning }),
	);

	if (!document) {
		console.error(`Failed to create warning for user ${warning.subject}.`);
		return undefined;
	}

	if (!database.warningsBySubject.has(warning.subject.value.id)) {
		await fetchWarnings(database, warning.subject);
	}

	database.warningsBySubject.get(warning.subject.value.id)!.push(document);

	console.log(`Created warning ${document.ref}.`);

	return document;
}

/**
 * Deletes a warning document in the database.
 *
 * @param warning - The warning to delete.
 * @returns The deleted warning document.
 */
async function deleteWarning(
	database: Database,
	warning: Document<Warning>,
): Promise<Document<Warning> | undefined> {
	const document = await dispatchQuery<Warning>(
		database,
		$.Delete(warning.ref),
	);

	if (!document) {
		console.error(
			`Failed to delete warning given to user ${warning.data.subject}.`,
		);
		return undefined;
	}

	const indexOfWarningToRemove = database.warningsBySubject.get(
		warning.data.subject.value.id,
	)!.findIndex((warning) => warning.ref.value.id === document.ref.value.id)!;

	database.warningsBySubject.set(
		warning.data.subject.value.id,
		database.warningsBySubject.get(warning.data.subject.value.id)!.splice(
			indexOfWarningToRemove,
			indexOfWarningToRemove,
		),
	);

	console.log(`Deleted warning ${document.ref}.`);

	return document;
}

export { createWarning, deleteWarning, getWarnings };
