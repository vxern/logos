import { EntryRequest } from "./structs/entry-request.js";
import { Praise } from "./structs/praise.js";
import { Report } from "./structs/report.js";
import { Suggestion } from "./structs/suggestion.js";
import { User } from "./structs/user.js";
import { Warning } from "./structs/warning.js";
import { Document, Reference } from "./document.js";

type IndexesSignature<T = unknown> = Record<string, [takes: unknown, returns: T]>;

type GetParameterNames<I extends IndexesSignature> = Exclude<keyof I, "reference">;

type EntryRequestIndexes<T = Document<EntryRequest>> = {
	submitterAndGuild: [takes: [Reference, string], returns: T];
};

type PraiseIndexes<T = Map<string, Document<Praise>>> = {
	sender: [takes: Reference, returns: T];
	recipient: [takes: Reference, returns: T];
};

type ReportIndexes<T = Map<string, Document<Report>>> = {
	authorAndGuild: [takes: [Reference, string], returns: T];
};

type SuggestionIndexes<T = Map<string, Document<Suggestion>>> = {
	authorAndGuild: [takes: [Reference, string], returns: T];
};

type UserIndexes<T = Document<User>> = {
	reference: [takes: Reference, returns: T];
	id: [takes: string, returns: T];
};

type WarningIndexes<T = Map<string, Document<Warning>>> = {
	recipient: [takes: Reference, returns: T];
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

export { praiseIndexParameterToIndex, userIndexParameterToIndex, warningIndexParameterToIndex };
export type {
	EntryRequestIndexes,
	IndexesSignature,
	PraiseIndexes,
	ReportIndexes,
	SuggestionIndexes,
	UserIndexes,
	WarningIndexes,
};
