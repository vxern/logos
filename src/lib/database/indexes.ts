import Fauna from "fauna";
import { Document } from "./document";
import { EntryRequest } from "./structs/entry-request";
import { Guild } from "./structs/guild";
import { Praise } from "./structs/praise";
import { Report } from "./structs/report";
import { Suggestion } from "./structs/suggestion";
import { User } from "./structs/user";
import { Warning } from "./structs/warning";

type IndexesSignature<T = unknown> = Record<string, [takes: unknown, returns: T]>;

type GetParameterNames<I extends IndexesSignature> = Exclude<keyof I, "reference">;

type EntryRequestIndexes<T = Document<EntryRequest>> = {
	submitterAndGuild: [takes: [Fauna.values.Ref, string], returns: T];
};

type GuildIndexes<T = Document<Guild>> = {
	id: [takes: string, returns: T];
};

type PraiseIndexes<T = Map<string, Document<Praise>>> = {
	sender: [takes: Fauna.values.Ref, returns: T];
	recipient: [takes: Fauna.values.Ref, returns: T];
};

type ReportIndexes<T = Map<string, Document<Report>>> = {
	authorAndGuild: [takes: [Fauna.values.Ref, string], returns: T];
};

type SuggestionIndexes<T = Map<string, Document<Suggestion>>> = {
	authorAndGuild: [takes: [Fauna.values.Ref, string], returns: T];
};

type UserIndexes<T = Document<User>> = {
	reference: [takes: Fauna.values.Ref, returns: T];
	id: [takes: string, returns: T];
};

type WarningIndexes<T = Map<string, Document<Warning>>> = {
	recipient: [takes: Fauna.values.Ref, returns: T];
};

const guildIndexParameterToIndex: Record<GetParameterNames<GuildIndexes>, string> = {
	id: "GetGuildByID",
};

const praiseIndexParameterToIndex: Record<GetParameterNames<PraiseIndexes>, string> = {
	sender: "GetPraisesBySender",
	recipient: "GetPraisesByRecipient",
};

const userIndexParameterToIndex: Record<GetParameterNames<UserIndexes>, string> = {
	id: "GetUserByID",
};

const warningIndexParameterToIndex: Record<GetParameterNames<WarningIndexes>, string> = {
	recipient: "GetWarningsByRecipient",
};

export {
	guildIndexParameterToIndex,
	praiseIndexParameterToIndex,
	userIndexParameterToIndex,
	warningIndexParameterToIndex,
};
export type {
	EntryRequestIndexes,
	GuildIndexes,
	IndexesSignature,
	PraiseIndexes,
	ReportIndexes,
	SuggestionIndexes,
	UserIndexes,
	WarningIndexes,
};
