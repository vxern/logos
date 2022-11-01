import { faunadb } from '../../../deps.ts';
import { Client } from '../../client.ts';
import { dispatchQuery } from '../database.ts';
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
	client: Client,
	user: Reference,
): Promise<Document<Warning>[] | undefined> {
	const documents = await dispatchQuery<Warning[]>(
		client,
		$.Map(
			$.Paginate($.Match($.FaunaIndex('GetWarningsBySubject'), user)),
			$.Lambda('warning', $.Get($.Var('warning'))),
		),
	);

	if (!documents) {
		client.log.error(`Failed to fetch warnings by user.`);
		return undefined;
	}

	client.database.warningsBySubject.set(user.value.id, documents);

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
	client: Client,
	user: Reference,
): Promise<Document<Warning>[] | undefined> {
	return client.database.warningsBySubject.get(user.value.id) ?? await fetchWarnings(client, user);
}

/**
 * Creates a warning document in the database.
 *
 * @param warning - The warning to create.
 * @returns The created warning document.
 */
async function createWarning(
	client: Client,
	warning: Warning,
): Promise<Document<Warning> | undefined> {
	const document = await dispatchQuery<Warning>(
		client,
		$.Create($.Collection('Warnings'), { data: warning }),
	);

	if (!document) {
		client.log.error(`Failed to create warning for user ${warning.subject}.`);
		return undefined;
	}

	if (!client.database.warningsBySubject.has(warning.subject.value.id)) {
		await fetchWarnings(client, warning.subject);
	}

	client.database.warningsBySubject.get(warning.subject.value.id)!.push(document);

	client.log.info(`Created warning ${document.ref}.`);

	return document;
}

/**
 * Deletes a warning document in the database.
 *
 * @param warning - The warning to delete.
 * @returns The deleted warning document.
 */
async function deleteWarning(
	client: Client,
	warning: Document<Warning>,
): Promise<Document<Warning> | undefined> {
	const document = await dispatchQuery<Warning>(
		client,
		$.Delete(warning.ref),
	);

	if (!document) {
		client.log.error(`Failed to delete warning given to user ${warning.data.subject}.`);
		return undefined;
	}

	const indexOfWarningToRemove = client.database.warningsBySubject.get(
		warning.data.subject.value.id,
	)!.findIndex((warning) => warning.ref.value.id === document.ref.value.id)!;

	client.database.warningsBySubject.get(warning.data.subject.value.id)!.splice(
		indexOfWarningToRemove,
		1,
	);

	client.log.info(`Deleted warning ${document.ref}.`);

	return document;
}

export { createWarning, deleteWarning, getWarnings };
