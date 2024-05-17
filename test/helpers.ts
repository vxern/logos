import { type CreateEntryRequestOptions, EntryRequest } from "logos/database/entry-request";
import { type CreateGuildOptions, Guild } from "logos/database/guild";
import { type CreateGuildStatisticsOptions, GuildStatistics } from "logos/database/guild-statistics";
import { type CreatePraiseOptions, Praise } from "logos/database/praise";
import { type CreateReportOptions, Report } from "logos/database/report";
import { type CreateResourceOptions, Resource } from "logos/database/resource";
import { type CreateSuggestionOptions, Suggestion } from "logos/database/suggestion";
import { type CreateTicketOptions, Ticket } from "logos/database/ticket";
import { type CreateUserOptions, User } from "logos/database/user";
import { type CreateWarningOptions, Warning } from "logos/database/warning";
import type { DatabaseStore } from "logos/stores/database";

function entryRequest(database: DatabaseStore, options?: Partial<CreateEntryRequestOptions>): EntryRequest {
	return new EntryRequest(
		database,
		Object.assign(
			{
				createdAt: Date.now(),
				guildId: `${123}`,
				authorId: `${123}`,
				requestedRoleId: `${123}`,
				formData: {
					reason: "I am learning Polish in order to be able to speak with my Polish friends.",
					aim: "I would like to use the community to talk with people in VC.",
					whereFound: "I found the server on Disboard.",
				},
				isFinalised: false,
				forcedVerdict: undefined,
				ticketChannelId: undefined,
				votes: {},
			} satisfies CreateEntryRequestOptions,
			options,
		),
	);
}

function guild(database: DatabaseStore, options?: Partial<CreateGuildOptions>): Guild {
	return new Guild(
		database,
		Object.assign(
			{
				createdAt: Date.now(),
				guildId: `${123}`,
				languages: {
					localisation: "Armenian/Western",
					feature: "English",
					target: "English/American",
				},
				isNative: false,
			} satisfies CreateGuildOptions,
			options,
		),
	);
}

function guildStatistics(database: DatabaseStore, options?: Partial<CreateGuildStatisticsOptions>): GuildStatistics {
	return new GuildStatistics(
		database,
		Object.assign(
			{
				guildId: `${123}`,
				createdAt: Date.now(),
				statistics: {},
			} satisfies Required<CreateGuildStatisticsOptions>,
			options,
		),
	);
}

function praise(database: DatabaseStore, options?: Partial<CreatePraiseOptions>): Praise {
	return new Praise(
		database,
		Object.assign(
			{
				guildId: `${123}`,
				authorId: `${123}`,
				targetId: `${123}`,
				createdAt: Date.now().toString(),
				comment: "This user helped me a lot with their explanations.",
			} satisfies CreatePraiseOptions,
			options,
		),
	);
}

function report(database: DatabaseStore, options?: Partial<CreateReportOptions>): Report {
	return new Report(
		database,
		Object.assign(
			{
				guildId: `${123}`,
				authorId: `${123}`,
				createdAt: Date.now().toString(),
				formData: {
					reason: "Two users were making me uncomfortable with their derogatory comments.",
					users: "User 1, User 2",
					messageLink: "https://message.link",
				},
				isResolved: false,
			} satisfies CreateReportOptions,
			options,
		),
	);
}

function resource(database: DatabaseStore, options?: Partial<CreateResourceOptions>): Resource {
	return new Resource(
		database,
		Object.assign(
			{
				guildId: `${123}`,
				authorId: `${123}`,
				createdAt: Date.now().toString(),
				formData: { resource: "Link to resource for learning Romanian." },
				isResolved: false,
			} satisfies CreateResourceOptions,
			options,
		),
	);
}

function suggestion(database: DatabaseStore, options?: Partial<CreateSuggestionOptions>): Suggestion {
	return new Suggestion(
		database,
		Object.assign(
			{
				guildId: `${123}`,
				authorId: `${123}`,
				createdAt: Date.now().toString(),
				formData: { suggestion: "Add a new feature to Logos." },
				isResolved: false,
			} satisfies CreateSuggestionOptions,
			options,
		),
	);
}

function ticket(database: DatabaseStore, options?: Partial<CreateTicketOptions>): Ticket {
	return new Ticket(
		database,
		Object.assign(
			{
				createdAt: Date.now(),
				guildId: `${123}`,
				authorId: `${123}`,
				channelId: `${123}`,
				type: "standalone",
				formData: { topic: "I would like to partner with your server." },
				isResolved: false,
			} satisfies CreateTicketOptions,
			options,
		),
	);
}

function user(database: DatabaseStore, options?: Partial<CreateUserOptions>): User {
	return new User(
		database,
		Object.assign(
			{
				createdAt: Date.now(),
				userId: `${123}`,
				account: { language: "Romanian" },
				scores: {},
			} satisfies CreateUserOptions,
			options,
		),
	);
}

function warning(database: DatabaseStore, options?: Partial<CreateWarningOptions>): Warning {
	return new Warning(
		database,
		Object.assign(
			{
				guildId: `${123}`,
				authorId: `${123}`,
				targetId: `${123}`,
				createdAt: Date.now().toString(),
				reason: "User was hostile to other users on multiple occasions.",
				rule: "behaviour",
			} satisfies CreateWarningOptions,
			options,
		),
	);
}

export { entryRequest, guild, guildStatistics, praise, report, resource, suggestion, ticket, user, warning };
