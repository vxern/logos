import * as Fauna from 'fauna';
import { Warning } from 'logos/src/database/structs/users/warning.ts';
import { DatabaseAdapters, dispatchQuery, getUserMentionByReference } from 'logos/src/database/database.ts';

const $ = Fauna.query;

const adapter: DatabaseAdapters['warnings'] = {
	get: async (client, parameter, value) => {
		return client.database.cache.warningsBySubject.get(value.value.id) ?? await adapter.fetch(client, parameter, value);
	},
	fetch: async (client, _parameter, value) => {
		const documents = await dispatchQuery<Warning[]>(
			client,
			$.Map(
				$.Paginate($.Match($.FaunaIndex('GetWarningsBySubject'), value)),
				$.Lambda('warning', $.Get($.Var('warning'))),
			),
		);

		const userMention = getUserMentionByReference(client, value);

		if (documents === undefined) {
			client.log.error(`Failed to fetch warnings for ${userMention}. Reference: ${value}`);
			return undefined;
		}

		client.database.cache.warningsBySubject.set(value.value.id, documents);

		client.log.debug(`Fetched ${documents.length} warning(s) for ${userMention}.`);

		return documents;
	},
	create: async (client, warning) => {
		const document = await dispatchQuery<Warning>(
			client,
			$.Create($.Collection('Warnings'), { data: warning }),
		);

		const userMention = getUserMentionByReference(client, warning.subject);

		if (document === undefined) {
			client.log.error(`Failed to create warning for ${userMention}.`);
			return undefined;
		}

		if (!client.database.cache.warningsBySubject.has(warning.subject.value.id)) {
			await adapter.fetch(client, 'reference', warning.subject);
		}
		client.database.cache.warningsBySubject.get(warning.subject.value.id)!.push(document);

		client.log.debug(`Created warning for ${userMention}.`);

		return document;
	},
	delete: async (client, warning) => {
		const document = await dispatchQuery<Warning>(client, $.Delete(warning.ref));

		const userMention = getUserMentionByReference(client, warning.data.subject);

		if (document === undefined) {
			client.log.error(`Failed to delete warning for ${userMention}.`);
			return undefined;
		}

		const indexOfWarningToRemove = client.database.cache.warningsBySubject.get(warning.data.subject.value.id)!
			.findIndex((warning) => warning.ref.value.id === document.ref.value.id)!;

		client.database.cache.warningsBySubject.get(warning.data.subject.value.id)!.splice(
			indexOfWarningToRemove,
			1,
		);

		client.log.debug(`Deleted warning for ${userMention}.`);

		return document;
	},
};

export default adapter;
