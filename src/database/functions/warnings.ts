import * as Fauna from 'fauna';
import { Warning } from 'logos/src/database/structs/users/warning.ts';
import { Document, Reference } from 'logos/src/database/structs/document.ts';
import { dispatchQuery, getUserMentionByReference } from 'logos/src/database/database.ts';
import { Client } from 'logos/src/client.ts';

const $ = Fauna.query;

/**
 * Fetches warnings from the database.
 *
 * @param reference - Reference to the user for whom to get the warnings.
 * @returns An array of warning documents or undefined if not able to fetch.
 */
async function fetchWarnings(
	client: Client,
	reference: Reference,
): Promise<Document<Warning>[] | undefined> {
	const documents = await dispatchQuery<Warning[]>(
		client,
		$.Map(
			$.Paginate($.Match($.FaunaIndex('GetWarningsBySubject'), reference)),
			$.Lambda('warning', $.Get($.Var('warning'))),
		),
	);

	const userMention = getUserMentionByReference(client, reference);

	if (!documents) {
		client.log.error(`Failed to fetch warnings for ${userMention}. Reference: ${reference}`);
		return undefined;
	}

	client.database.warningsBySubject.set(reference.value.id, documents);

	client.log.debug(`Fetched ${documents.length} warning(s) for ${userMention}.`);

	return documents;
}

/**
 * Attempts to get user warnings from cache, and if the warnings do not exist,
 * attempts to fetch them from the database directly.
 *
 * @param reference - The reference to the user for indexing the database.
 * @returns The warnings.
 */
async function getWarnings(
	client: Client,
	reference: Reference,
): Promise<Document<Warning>[] | undefined> {
	return client.database.warningsBySubject.get(reference.value.id) ?? await fetchWarnings(client, reference);
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

	const userMention = getUserMentionByReference(client, warning.subject);

	if (!document) {
		client.log.error(`Failed to create warning for ${userMention}.`);
		return undefined;
	}

	if (!client.database.warningsBySubject.has(warning.subject.value.id)) {
		await fetchWarnings(client, warning.subject);
	}

	client.database.warningsBySubject.get(warning.subject.value.id)!.push(document);

	client.log.debug(`Created warning for ${userMention}.`);

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

	const userMention = getUserMentionByReference(client, warning.data.subject);

	if (!document) {
		client.log.error(`Failed to delete warning for ${userMention}.`);
		return undefined;
	}

	const indexOfWarningToRemove = client.database.warningsBySubject.get(
		warning.data.subject.value.id,
	)!.findIndex((warning) => warning.ref.value.id === document.ref.value.id)!;

	client.database.warningsBySubject.get(warning.data.subject.value.id)!.splice(
		indexOfWarningToRemove,
		1,
	);

	client.log.debug(`Deleted warning for ${userMention}.`);

	return document;
}

export { createWarning, deleteWarning, getWarnings };
