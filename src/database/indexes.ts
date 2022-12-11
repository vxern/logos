import { Article, ArticleChange, Praise, User, Warning } from 'logos/src/database/structs/mod.ts';
import { Reference } from 'logos/src/database/document.ts';
import { Language } from 'logos/types.ts';

type ArticleChangeIndexes<T = Array<ArticleChange>> = {
	author: [takes: Reference, returns: T];
	article: [takes: Reference, returns: T];
};

const articleChangeIndexParameterToIndex: Record<keyof ArticleChangeIndexes, string> = {
	author: 'GetArticleChangesByAuthor',
	article: 'GetArticleChangesByArticle',
};

type ArticleIndexes<T = Array<Article>> = {
	author: [takes: Reference, returns: T];
	language: [takes: Language, returns: T];
};

const articleIndexParameterToIndex: Record<keyof ArticleIndexes, string> = {
	author: 'GetArticlesByAuthor',
	language: 'GetArticlesByLanguage',
};

type PraiseIndexes<T = Array<Praise>> = {
	sender: [takes: Reference, returns: T];
	recipient: [takes: Reference, returns: T];
};

const praiseIndexParameterToIndex: Record<keyof PraiseIndexes, string> = {
	sender: 'GetPraisesBySender',
	recipient: 'GetPraisesByRecipient',
};

type UserIndexes<T = User> = {
	reference: [takes: Reference, returns: T];
	id: [takes: string, returns: T];
};

const userIndexParameterToIndex: Record<Exclude<keyof UserIndexes, 'reference'>, string> = {
	id: 'GetUserByID',
};

type WarningIndexes<T = Array<Warning>> = {
	recipient: [takes: Reference, returns: T];
};

const warningIndexParameterToIndex: Record<keyof WarningIndexes, string> = {
	recipient: 'GetWarningsByRecipient',
};

export {
	articleChangeIndexParameterToIndex,
	articleIndexParameterToIndex,
	praiseIndexParameterToIndex,
	userIndexParameterToIndex,
	warningIndexParameterToIndex,
};
export type { ArticleChangeIndexes, ArticleIndexes, PraiseIndexes, UserIndexes, WarningIndexes };
