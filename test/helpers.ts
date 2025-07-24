import { type CreateEntryRequestOptions, EntryRequest } from "rost/models/entry-request";
import { type CreateGuildOptions, Guild } from "rost/models/guild";
import { type CreateGuildStatisticsOptions, GuildStatistics } from "rost/models/guild-statistics";
import { type CreatePraiseOptions, Praise } from "rost/models/praise";
import { type CreateReportOptions, Report } from "rost/models/report";
import { type CreateResourceOptions, Resource } from "rost/models/resource";
import { type CreateSuggestionOptions, Suggestion } from "rost/models/suggestion";
import { type CreateTicketOptions, Ticket } from "rost/models/ticket";
import { type CreateUserOptions, User } from "rost/models/user";
import { type CreateWarningOptions, Warning } from "rost/models/warning";
import type { DatabaseStore } from "rost/stores/database";

function entryRequest(database: DatabaseStore, options?: Partial<CreateEntryRequestOptions>): EntryRequest {
	return new EntryRequest(database, {
		createdAt: Date.now(),
		guildId: `${123}`,
		authorId: `${123}`,
		requestedRoleId: `${123}`,
		formData: {
			reason: "I am learning Polish in order to be able to speak with my Polish friends.",
			aim: "I would like to use the community to talk with people in VC.",
			whereFound: "I found the server on Disboard.",
		},
		isResolved: false,
		forcedVerdict: undefined,
		ticketChannelId: undefined,
		votes: {},
		...options,
	});
}

function guild(database: DatabaseStore, options?: Partial<CreateGuildOptions>): Guild {
	return new Guild(database, {
		createdAt: Date.now(),
		guildId: `${123}`,
		languages: {
			localisation: "Armenian/Western",
			feature: "English",
			target: "English/American",
		},
		isNative: false,
		...options,
	});
}

function guildStatistics(database: DatabaseStore, options?: Partial<CreateGuildStatisticsOptions>): GuildStatistics {
	return new GuildStatistics(database, {
		guildId: `${123}`,
		createdAt: Date.now(),
		statistics: {},
		...options,
	});
}

function praise(database: DatabaseStore, options?: Partial<CreatePraiseOptions>): Praise {
	return new Praise(database, {
		guildId: `${123}`,
		authorId: `${123}`,
		targetId: `${123}`,
		createdAt: Date.now().toString(),
		comment: "This user helped me a lot with their explanations.",
		...options,
	});
}

function report(database: DatabaseStore, options?: Partial<CreateReportOptions>): Report {
	return new Report(database, {
		guildId: `${123}`,
		authorId: `${123}`,
		createdAt: Date.now().toString(),
		formData: {
			reason: "Two users were making me uncomfortable with their derogatory comments.",
			users: "User 1, User 2",
			messageLink: "https://message.link",
		},
		isResolved: false,
		...options,
	});
}

function resource(database: DatabaseStore, options?: Partial<CreateResourceOptions>): Resource {
	return new Resource(database, {
		guildId: `${123}`,
		authorId: `${123}`,
		createdAt: Date.now().toString(),
		formData: { resource: "Link to resource for learning Romanian." },
		isResolved: false,
		...options,
	});
}

function suggestion(database: DatabaseStore, options?: Partial<CreateSuggestionOptions>): Suggestion {
	return new Suggestion(database, {
		guildId: `${123}`,
		authorId: `${123}`,
		createdAt: Date.now().toString(),
		formData: { suggestion: "Add a new feature to Rost." },
		isResolved: false,
		...options,
	});
}

function ticket(database: DatabaseStore, options?: Partial<CreateTicketOptions>): Ticket {
	return new Ticket(database, {
		createdAt: Date.now(),
		guildId: `${123}`,
		authorId: `${123}`,
		channelId: `${123}`,
		type: "standalone",
		formData: { topic: "I would like to partner with your server." },
		isResolved: false,
		...options,
	});
}

function user(database: DatabaseStore, options?: Partial<CreateUserOptions>): User {
	return new User(database, {
		createdAt: Date.now(),
		userId: `${123}`,
		account: { language: "Romanian" },
		scores: {},
		...options,
	});
}

function warning(database: DatabaseStore, options?: Partial<CreateWarningOptions>): Warning {
	return new Warning(database, {
		guildId: `${123}`,
		authorId: `${123}`,
		targetId: `${123}`,
		createdAt: Date.now().toString(),
		reason: "User was hostile to other users on multiple occasions.",
		rule: "behaviour",
		...options,
	});
}

export { entryRequest, guild, guildStatistics, praise, report, resource, suggestion, ticket, user, warning };
