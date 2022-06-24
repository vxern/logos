import { Member, User } from '../../../../../deps.ts';
import configuration from '../../../../configuration.ts';
import { ArticleChange } from '../../../../database/structs/articles/article-change.ts';
import { Article } from '../../../../database/structs/articles/article.ts';
import { bold, code, codeMultiline } from '../../../../formatting.ts';
import { mentionUser } from '../../../../utils.ts';
import { MessageGenerators } from './generators.ts';

/** Type representing events that occur within a guild. */
type GuildEvents = {
	/** A verification request has been accepted. */
	verificationRequestAccept: [user: User, by: Member];

	/** A verification request has been rejected. */
	verificationRequestReject: [user: User, by: Member];

	/** An entry request has been accepted. */
	entryRequestAccept: [member: Member];

	/** An entry request has been rejected. */
	entryRequestReject: [member: Member, reason: string];

	/** An article has been created. */
	articleCreate: [article: Article, by: Member];

	/** An article creation request has been accepted. */
	articleCreateAccept: [article: Article, by: Member];

	/** An article creation request has been rejected. */
	articleCreateReject: [article: Article, by: Member];

	/** An article has been edited. */
	articleEdit: [article: Article, change: ArticleChange, by: Member];

	/** An article edit request has been accepted. */
	articleEditAccept: [article: Article, change: ArticleChange, by: Member];

	/** An article edit request been rejected. */
	articleEditReject: [article: Article, change: ArticleChange, by: Member];

	/** An article has been locked. */
	articleLock: [article: Article, by: Member];
};

/** Contains the message generators for (custom) guild events. */
const generators: MessageGenerators<GuildEvents> = {
	'verificationRequestAccept': {
		title: 'Verification request accepted',
		message: (user, by) =>
			`${mentionUser(user)}'s verification request has been accepted by ${
				mentionUser(by.user)
			}`,
		filter: (origin, _user, by) => origin.id === by.guild.id,
		color: configuration.interactions.responses.colors.green,
	},
	'verificationRequestReject': {
		title: 'Verification request rejected',
		message: (user, by) =>
			`${mentionUser(user)}'s verification request has been rejected by ${
				mentionUser(by.user)
			}`,
		filter: (origin, _user, by) => origin.id === by.guild.id,
		color: configuration.interactions.responses.colors.red,
	},
	'entryRequestAccept': {
		title: 'Entry granted',
		message: (member) =>
			`Entry has been granted to ${mentionUser(member.user)}.`,
		filter: (origin, member) => origin.id === member.guild.id,
		color: configuration.interactions.responses.colors.green,
	},
	'entryRequestReject': {
		title: 'Entry refused',
		message: (member, reason) =>
			`Entry has been refused to ${mentionUser(member.user)}.

${bold('REASON')}
${codeMultiline(reason)}`,
		filter: (origin, member, _reason) => origin.id === member.guild.id,
		color: configuration.interactions.responses.colors.green,
	},
	'articleCreate': {
		title: 'Article created',
		message: (article, by) =>
			`An article has been created by ${mentionUser(by.user)}:

${bold(article.content.title)}

${article.content.body}`,
		filter: (origin, _article, by) => origin.id === by.guild.id,
		color: configuration.interactions.responses.colors.green,
	},
	'articleCreateAccept': {
		title: 'Article verified',
		message: (article, by) =>
			`An article submission has been verified by ${mentionUser(by.user)}:

${bold(article.content.title)}

${article.content.body}`,
		filter: (origin, _article, by) => origin.id === by.guild.id,
		color: configuration.interactions.responses.colors.green,
	},
	'articleCreateReject': {
		title: 'Article rejected',
		message: (article, by) =>
			`An article submission has been rejected by ${mentionUser(by.user)}:

${bold(article.content.title)}

${article.content.body}`,
		filter: (origin, _article, by) => origin.id === by.guild.id,
		color: configuration.interactions.responses.colors.red,
	},
	'articleEdit': {
		title: 'Article updated',
		message: (before, after, by) =>
			`The article ${code(before.content.title)} has been updated by ${
				mentionUser(by.user)
			}:

${after.content.body}`,
		filter: (origin, _before, _after, by) => origin.id === by.guild.id,
		color: configuration.interactions.responses.colors.blue,
	},
	'articleEditAccept': {
		title: 'Article edit accepted',
		message: (_article, change, by) =>
			`An article edit has been verified by ${mentionUser(by.user)}:

${bold(change.content.title)}

${change.content.body}`,
		filter: (origin, _article, _change, by) => origin.id === by.guild.id,
		color: configuration.interactions.responses.colors.green,
	},
	'articleEditReject': {
		title: 'Article edit rejected',
		message: (_article, change, by) =>
			`An article edit has been rejected by ${mentionUser(by.user)}:

${bold(change.content.title)}

${change.content.body}`,
		filter: (origin, _article, _change, by) => origin.id === by.guild.id,
		color: configuration.interactions.responses.colors.red,
	},
	'articleLock': {
		title: 'Article locked',
		message: (article, by) =>
			`The article ${code(article.content.title)} has been locked by ${
				mentionUser(by.user)
			}.`,
		filter: (origin, _article, by) => origin.id === by.guild.id,
		color: configuration.interactions.responses.colors.yellow,
	},
};

export default generators;
export type { GuildEvents };
