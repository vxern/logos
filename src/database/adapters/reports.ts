import * as Fauna from 'fauna';
import { Report } from 'logos/src/database/structs/mod.ts';
import {
	CacheAdapter,
	DatabaseAdapters,
	dispatchQuery,
	getUserMentionByReference,
	setNested,
	stringifyValue,
} from 'logos/src/database/database.ts';
import { Document } from 'logos/src/database/document.ts';
import { ReportIndexes } from 'logos/src/database/indexes.ts';

const $ = Fauna.query;

const cache: CacheAdapter<Report, ReportIndexes<Document<Report>>, 'delete'> = {
	get: (client, parameter, value) => {
		if (parameter === 'authorAndGuild') {
			return client.database.cache.reportsByAuthorAndGuild.get(value);
		}

		return client.database.cache.reportsByRecipientAndGuild.get(value);
	},
	set: (client, parameter, value, report) => {
		const reportReferenceId = stringifyValue(report.ref);

		if (parameter === 'authorAndGuild') {
			return setNested(client.database.cache.reportsByAuthorAndGuild, value, reportReferenceId, report);
		}

		return setNested(client.database.cache.reportsByRecipientAndGuild, value, reportReferenceId, report);
	},
	delete: (client, parameter, value, report) => {
		const reportReferenceId = stringifyValue(report.ref);

		if (parameter === 'authorAndGuild') {
			return client.database.cache.reportsByAuthorAndGuild.get(value)?.delete(reportReferenceId) ?? false;
		}

		return client.database.cache.reportsByRecipientAndGuild.get(value)?.delete(reportReferenceId) ?? false;
	},
};

const adapter: DatabaseAdapters['reports'] = {
	prefetch: async (client) => {
		const documents = await dispatchQuery<Report[]>(
			client,
			$.Map(
				$.Paginate($.Documents($.Collection('Reports'))),
				$.Lambda('report', $.Get($.Var('report'))),
			),
		);
		if (documents === undefined) {
			client.log.error(`Failed to fetch all reports.`);
			return;
		}

		for (const document of documents) {
			const guildId = stringifyValue(document.data.guild);
			{
				const authorReferenceId = stringifyValue(document.data.author);
				const compositeId = `${authorReferenceId}${guildId}`;

				cache.set(client, 'authorAndGuild', compositeId, document);
			}
			{
				for (const recipient of document.data.recipients) {
					const recipientReferenceId = stringifyValue(recipient);
					const compositeId = `${recipientReferenceId}${guildId}`;

					cache.set(client, 'recipientAndGuild', compositeId, document);
				}
			}
		}

		client.log.debug(`Fetched ${documents.length} report(s).`);
	},
	get: (client, parameter, parameterValue) => {
		if (parameter === 'authorAndGuild') {
			const [author, guild] = parameterValue;
			const authorReferenceId = stringifyValue(author);
			const guildId = stringifyValue(guild);
			const compositeId = `${authorReferenceId}${guildId}`;

			return cache.get(client, parameter, compositeId) as Document<Report> | undefined;
		}

		const [recipient, guild] = parameterValue;
		const recipientReferenceId = stringifyValue(recipient);
		const guildId = stringifyValue(guild);
		const compositeId = `${recipientReferenceId}${guildId}`;

		return cache.get(client, parameter, compositeId) as Document<Report> | undefined;
	},
	create: async (client, report) => {
		const document = await dispatchQuery<Report>(
			client,
			$.Create($.Collection('Reports'), { data: report }),
		);

		// TODO(vxern): Possible security risk of pointing to a report that stores information about the submitter as well as other users involved.

		const authorReferenceId = stringifyValue(report.author);
		const recipientReferenceIds = report.recipients.map((recipient) => stringifyValue(recipient));
		const guildId = stringifyValue(report.guild);

		const authorMention = getUserMentionByReference(client, report.author);
		const recipientMentions = report.recipients
			.map((recipient) => getUserMentionByReference(client, recipient))
			.join(', ');

		if (document === undefined) {
			client.log.error(
				`Failed to create report submitted by ${authorMention} on guild with ID ${guildId} for ${recipientMentions}.`,
			);
			return undefined;
		}

		{
			const compositeId = `${authorReferenceId}${guildId}`;

			cache.set(client, 'authorAndGuild', compositeId, document);
		}
		{
			for (const recipientReferenceId of recipientReferenceIds) {
				const compositeId = `${recipientReferenceId}${guildId}`;

				cache.set(client, 'recipientAndGuild', compositeId, document);
			}
		}

		client.log.debug(
			`Created report submitted by ${authorMention} on guild with ID ${guildId} for ${recipientMentions}.`,
		);

		return document;
	},
	update: async (client, report) => {
		const document = await dispatchQuery<Report>(client, $.Update(report.ref, { data: report.data }));

		const authorReferenceId = stringifyValue(report.data.author);
		const recipientReferenceIds = report.data.recipients.map((recipient) => stringifyValue(recipient));
		const guildId = stringifyValue(report.data.guild);

		const authorMention = getUserMentionByReference(client, report.data.author);
		const recipientMentions = report.data.recipients
			.map((recipient) => getUserMentionByReference(client, recipient))
			.join(', ');

		if (document === undefined) {
			client.log.error(
				`Failed to update report submitted by ${authorMention} on guild with ID ${guildId} for ${recipientMentions}.`,
			);
			return undefined;
		}

		{
			const compositeId = `${authorReferenceId}${guildId}`;

			cache.set(client, 'authorAndGuild', compositeId, document);
		}
		{
			for (const recipientReferenceId of recipientReferenceIds) {
				const compositeId = `${recipientReferenceId}${guildId}`;

				cache.set(client, 'recipientAndGuild', compositeId, document);
			}
		}

		client.log.debug(
			`Updated report submitted by ${authorMention} on guild with ID ${guildId} for ${recipientMentions}.`,
		);

		return document;
	},
};

export default adapter;
