import * as Fauna from 'fauna';
import { Praise } from 'logos/src/database/structs/users/praise.ts';
import { Warning } from 'logos/src/database/structs/users/warning.ts';
import { DatabaseAdapters, dispatchQuery, getUserMentionByReference } from 'logos/src/database/database.ts';
import { capitalise } from 'logos/formatting.ts';

const $ = Fauna.query;

const adapter: DatabaseAdapters['praises'] = {
	get: async (client, parameter, value) => {
		const cache = parameter === 'author'
			? client.database.cache.praisesByAuthor
			: client.database.cache.praisesBySubject;

		return cache.get(value.value.id) ?? await adapter.fetch(client, parameter, value);
	},
	fetch: async (client, parameter, value) => {
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

		if (documents === undefined) {
			client.log.error(`Failed to fetch praises ${action} by ${userMention}.`);
			return undefined;
		}

		const cache = parameter === 'author'
			? client.database.cache.praisesByAuthor
			: client.database.cache.praisesBySubject;

		cache.set(value.value.id, documents);

		client.log.debug(`Fetched ${documents.length} praise(s) ${action} by ${userMention}.`);

		return documents;
	},
	create: async (client, praise) => {
		const document = await dispatchQuery<Warning>(
			client,
			$.Create($.Collection('Praises'), { data: praise }),
		);

		const authorMention = getUserMentionByReference(client, praise.author);
		const subjectMention = getUserMentionByReference(client, praise.subject);

		if (document === undefined) {
			client.log.error(`Failed to create praise given by ${authorMention} to ${subjectMention}.`);
			return undefined;
		}

		const promises = [];

		if (!client.database.cache.praisesByAuthor.has(praise.author.value.id)) {
			promises.push(
				adapter.fetch(client, 'author', praise.author).then(() =>
					client.database.cache.praisesByAuthor.get(praise.author.value.id)!.push(document)
				),
			);
		}

		if (!client.database.cache.praisesBySubject.has(praise.subject.value.id)) {
			promises.push(
				adapter.fetch(client, 'subject', praise.subject).then(() =>
					client.database.cache.praisesBySubject.get(praise.subject.value.id)!.push(document)
				),
			);
		}

		await Promise.all(promises);

		client.log.debug(`Created praise document given by ${authorMention} to ${subjectMention}.`);

		return document;
	},
};

export default adapter;
