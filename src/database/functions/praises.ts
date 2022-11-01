import { faunadb } from '../../../deps.ts';
import { Client } from '../../client.ts';
import { capitalise } from '../../formatting.ts';
import { dispatchQuery, getUserMentionByReference } from '../database.ts';
import { Document, Reference } from '../structs/document.ts';
import { Praise } from '../structs/users/praise.ts';
import { Warning } from '../structs/users/warning.ts';

const $ = faunadb.query;

/** Defines parameters used in indexing praises. */
interface PraiseIndexParameters {
	/** The reference to the author of database praise. */
	author: Reference;

	/** The reference to the recipient of database praise. */
	subject: Reference;
}

/**
 * Fetches praises from the database.
 *
 * @param parameter - The parameter for indexing the database.
 * @param value - The value corresponding to the parameter.
 * @returns An array of praise documents or undefined.
 */
async function fetchPraises<
	K extends keyof PraiseIndexParameters,
	V extends PraiseIndexParameters[K],
>(
	client: Client,
	parameter: K,
	value: V,
): Promise<Document<Praise>[] | undefined> {
	const parameterCapitalised = capitalise(parameter);
	const index = `GetPraisesBy${parameterCapitalised}`;

	const documents = await dispatchQuery<Praise[]>(
		client,
		$.Map(
			$.Paginate($.Match($.FaunaIndex(index), value)),
			$.Lambda('praise', $.Get($.Var('praise'))),
		),
	);

	const userMention = getUserMentionByReference(client, value);

	const action = parameter === 'author' ? 'given' : 'received';

	if (!documents) {
		client.log.error(`Failed to fetch praises ${action} by ${userMention}.`);
		return undefined;
	}

	const cache = parameter === 'author' ? client.database.praisesByAuthor : client.database.praisesBySubject;

	cache.set(value.value.id, documents);

	client.log.debug(`Fetched ${documents.length} praise(s) ${action} by ${userMention}.`);

	return documents;
}

/**
 * Attempts to get praises from cache, and if the praises do not exist, attempts
 * to fetch them from the database.
 *
 * @param parameter - The parameter for indexing the database.
 * @param value - The value corresponding to the parameter.
 * @returns The praises.
 */
async function getPraises<
	K extends keyof PraiseIndexParameters,
	V extends PraiseIndexParameters[K],
>(
	client: Client,
	parameter: K,
	value: V,
): Promise<Document<Praise>[] | undefined> {
	const cache = parameter === 'author' ? client.database.praisesByAuthor : client.database.praisesBySubject;

	return cache.get(value.value.id) ?? await fetchPraises(client, parameter, value);
}

/**
 * Creates a praise document in the database.
 *
 * @param praise - The praise to create.
 * @returns The created praise document.
 */
async function createPraise(
	client: Client,
	praise: Praise,
): Promise<Document<Praise> | undefined> {
	const document = await dispatchQuery<Warning>(
		client,
		$.Create($.Collection('Praises'), { data: praise }),
	);

	const authorMention = getUserMentionByReference(client, praise.author);
	const subjectMention = getUserMentionByReference(client, praise.subject);

	if (!document) {
		client.log.error(`Failed to create praise given by ${authorMention} to ${subjectMention}.`);
		return undefined;
	}

	if (!client.database.praisesByAuthor.has(praise.author.value.id)) {
		await fetchPraises(client, 'author', praise.author);
	}
	client.database.praisesByAuthor.get(praise.author.value.id)!.push(document);

	if (!client.database.praisesBySubject.has(praise.subject.value.id)) {
		await fetchPraises(client, 'subject', praise.subject);
	}
	client.database.praisesBySubject.get(praise.subject.value.id)!.push(document);

	client.log.debug(`Created praise document given by ${authorMention} to ${subjectMention}.`);

	return document;
}

export { createPraise, getPraises };
