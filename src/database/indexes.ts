import { Article, ArticleChange, EntryRequest, Praise, Report, User, Warning } from 'logos/src/database/structs/mod.ts';
import { Document, Reference } from 'logos/src/database/document.ts';
import { Language } from 'logos/types.ts';

type IndexesSignature<T = unknown> = Record<string, [takes: unknown, returns: T]>;

type GetParameterNames<I extends IndexesSignature> = Exclude<keyof I, 'reference'>;

type ArticleChangeIndexes<T = Map<string, Document<ArticleChange>>> = {
	author: [takes: Reference, returns: T];
	article: [takes: Reference, returns: T];
};

type ArticleIndexes<T = Map<string, Document<Article>>> = {
	author: [takes: Reference, returns: T];
	language: [takes: Language, returns: T];
};

type EntryRequestIndexes<T = Document<EntryRequest>> = {
	submitterAndGuild: [takes: [Reference, string], returns: T];
};

type PraiseIndexes<T = Map<string, Document<Praise>>> = {
	sender: [takes: Reference, returns: T];
	recipient: [takes: Reference, returns: T];
};

type ReportIndexes<T = Document<Report>> = {
	authorAndGuild: [takes: [Reference, string], returns: T];
	recipientAndGuild: [takes: [Reference, string], returns: T];
};

type UserIndexes<T = Document<User>> = {
	reference: [takes: Reference, returns: T];
	id: [takes: string, returns: T];
};

type WarningIndexes<T = Map<string, Document<Warning>>> = {
	recipient: [takes: Reference, returns: T];
};

const articleChangeIndexParameterToIndex: Record<GetParameterNames<ArticleChangeIndexes>, string> = {
	author: 'GetArticleChangesByAuthor',
	article: 'GetArticleChangesByArticle',
};

const articleIndexParameterToIndex: Record<GetParameterNames<ArticleIndexes>, string> = {
	author: 'GetArticlesByAuthor',
	language: 'GetArticlesByLanguage',
};

const praiseIndexParameterToIndex: Record<GetParameterNames<PraiseIndexes>, string> = {
	sender: 'GetPraisesBySender',
	recipient: 'GetPraisesByRecipient',
};

const userIndexParameterToIndex: Record<GetParameterNames<UserIndexes>, string> = {
	id: 'GetUserByID',
};

const warningIndexParameterToIndex: Record<GetParameterNames<WarningIndexes>, string> = {
	recipient: 'GetWarningsByRecipient',
};

export {
	articleChangeIndexParameterToIndex,
	articleIndexParameterToIndex,
	praiseIndexParameterToIndex,
	userIndexParameterToIndex,
	warningIndexParameterToIndex,
};
export type {
	ArticleChangeIndexes,
	ArticleIndexes,
	EntryRequestIndexes,
	IndexesSignature,
	PraiseIndexes,
	ReportIndexes,
	UserIndexes,
	WarningIndexes,
};
