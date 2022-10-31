import { faunadb } from '../../../deps.ts';
import { capitalise } from '../../formatting.ts';
import { Database, dispatchQuery } from '../database.ts';
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
	database: Database,
	parameter: K,
	value: V,
): Promise<Document<Praise>[] | undefined> {
	const parameterCapitalised = capitalise(parameter);
	const index = `GetPraisesBy${parameterCapitalised}`;

	const documents = await dispatchQuery<Praise[]>(
		database,
		$.Map(
			$.Paginate($.Match($.FaunaIndex(index), value)),
			$.Lambda('praise', $.Get($.Var('praise'))),
		),
	);

	if (!documents) {
		console.error(
			`Failed to fetch praises by ${parameterCapitalised}.`,
		);
		return undefined;
	}

	const cache = parameter === 'author' ? database.praisesByAuthor : database.praisesBySubject;

	cache.set(
		value.value.id,
		documents,
	);

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
	database: Database,
	parameter: K,
	value: V,
): Promise<Document<Praise>[] | undefined> {
	const cache = parameter === 'author' ? database.praisesByAuthor : database.praisesBySubject;

	return cache.get(value.value.id) ??
		await fetchPraises(database, parameter, value);
}

/**
 * Creates a praise document in the database.
 *
 * @param praise - The praise to create.
 * @returns The created praise document.
 */
async function createPraise(
	database: Database,
	praise: Praise,
): Promise<Document<Praise> | undefined> {
	const document = await dispatchQuery<Warning>(
		database,
		$.Create($.Collection('Praises'), { data: praise }),
	);

	if (!document) {
		console.error(`Failed to create praises for user ${praise.subject}.`);
		return undefined;
	}

	if (!database.praisesByAuthor.has(praise.author.value.id)) {
		await fetchPraises(database, 'author', praise.author);
	}

	database.praisesByAuthor.get(praise.author.value.id)!.push(document);

	if (!database.praisesBySubject.has(praise.subject.value.id)) {
		await fetchPraises(database, 'subject', praise.subject);
	}

	database.praisesBySubject.get(praise.subject.value.id)!.push(document);

	console.log(`Created praise ${document.ref}.`);

	return document;
}

export { createPraise, getPraises };
