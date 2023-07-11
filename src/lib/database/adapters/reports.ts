import constants from "../../../constants.js";
import {
	CacheAdapter,
	Database,
	dispatchQuery,
	getUserMentionByReference,
	setNested,
	stringifyValue,
} from "../database.js";
import { Document } from "../document.js";
import { ReportIndexes } from "../indexes.js";
import { Report } from "../structs/report.js";
import Fauna from "fauna";

const $ = Fauna.query;

const cache: CacheAdapter<Report, ReportIndexes<Document<Report>>, "delete"> = {
	get: (client, _, value) => {
		return client.database.cache.reportsByAuthorAndGuild.get(value);
	},
	set: (client, _, value, report) => {
		const reportReferenceId = stringifyValue(report.ref);

		setNested(client.database.cache.reportsByAuthorAndGuild, value, reportReferenceId, report);
	},
	delete: (client, _, value, report) => {
		const reportReferenceId = stringifyValue(report.ref);

		return client.database.cache.reportsByAuthorAndGuild.get(value)?.delete(reportReferenceId) ?? false;
	},
};

const adapter: Database["adapters"]["reports"] = {
	prefetch: async (client) => {
		const documents = await dispatchQuery<Report[]>(
			client,
			$.Map($.Paginate($.Documents($.Collection("Reports"))), $.Lambda("report", $.Get($.Var("report")))),
		);
		if (documents === undefined) {
			client.log.error("Failed to fetch all reports.");
			return;
		}

		for (const document of documents) {
			const guildId = stringifyValue(document.data.guild);
			const authorReferenceId = stringifyValue(document.data.author);
			const compositeId = `${authorReferenceId}${constants.symbols.meta.idSeparator}${guildId}`;

			cache.set(client, "authorAndGuild", compositeId, document);
		}

		client.log.debug(`Fetched ${documents.length} report(s).`);
	},
	get: (client, parameter, parameterValue) => {
		const [author, guild] = parameterValue;
		const authorReferenceId = stringifyValue(author);
		const guildId = stringifyValue(guild);
		const compositeId = `${authorReferenceId}${constants.symbols.meta.idSeparator}${guildId}`;

		return cache.get(client, parameter, compositeId) as Document<Report> | undefined;
	},
	create: async (client, report) => {
		const document = await dispatchQuery<Report>(client, $.Create($.Collection("Reports"), { data: report }));

		const authorReferenceId = stringifyValue(report.author);
		const guildId = stringifyValue(report.guild);

		const authorMention = getUserMentionByReference(client, report.author);

		if (document === undefined) {
			client.log.error(`Failed to create report submitted by ${authorMention} on guild with ID ${guildId}.`);
			return undefined;
		}

		const compositeId = `${authorReferenceId}${constants.symbols.meta.idSeparator}${guildId}`;

		cache.set(client, "authorAndGuild", compositeId, document);

		client.log.debug(`Created report submitted by ${authorMention} on guild with ID ${guildId}.`);

		return document;
	},
	update: async (client, report) => {
		const document = await dispatchQuery<Report>(client, $.Update(report.ref, { data: report.data }));

		const authorReferenceId = stringifyValue(report.data.author);
		const guildId = stringifyValue(report.data.guild);

		const authorMention = getUserMentionByReference(client, report.data.author);

		if (document === undefined) {
			client.log.error(`Failed to update report submitted by ${authorMention} on guild with ID ${guildId}.`);
			return undefined;
		}

		const compositeId = `${authorReferenceId}${constants.symbols.meta.idSeparator}${guildId}`;

		cache.set(client, "authorAndGuild", compositeId, document);

		client.log.debug(`Updated report submitted by ${authorMention} on guild with ID ${guildId}.`);

		return document;
	},
};

export default adapter;
