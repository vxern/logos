import { Member, User } from '../../../../../deps.ts';
import configuration from '../../../../configuration.ts';
import { Article } from '../../../../database/structs/article.ts';
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

	/** An article has been submitted. */
	articleSubmit: [article: Article, by: Member];

	/** An article has been edited. */
	articleUpdate: [before: Article, after: Article, by: Member];

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
		color: configuration.responses.colors.green,
	},
	'verificationRequestReject': {
		title: 'Verification request rejected',
		message: (user, by) =>
			`${mentionUser(user)}'s verification request has been rejected by ${
				mentionUser(by.user)
			}`,
		filter: (origin, _user, by) => origin.id === by.guild.id,
		color: configuration.responses.colors.red,
	},
	'entryRequestAccept': {
		title: 'Entry granted',
		message: (member) =>
			`Entry has been granted to ${mentionUser(member.user)}.`,
		filter: (origin, member) => origin.id === member.guild.id,
		color: configuration.responses.colors.green,
	},
	'entryRequestReject': {
		title: 'Entry refused',
		message: (member, reason) =>
			`Entry has been refused to ${mentionUser(member.user)}.

${bold('REASON')}
${codeMultiline(reason)}`,
		filter: (origin, member, _reason) => origin.id === member.guild.id,
		color: configuration.responses.colors.green,
	},
	'articleSubmit': {
		title: 'Article submitted',
		message: (article, by) =>
			`An article has been submitted by ${mentionUser(by.user)}.

${codeMultiline(`${article.title}\n\n${article.body}`)}`,
		filter: (origin, _article, by) => origin.id === by.guild.id,
		color: configuration.responses.colors.green,
	},
	'articleUpdate': {
		title: 'Article updated',
		message: (before, after, by) =>
			`An article has been updated by ${mentionUser(by.user)}.

${bold('BEFORE')}
${codeMultiline(`${before.title}\n\n${before.body}`)}
${bold('AFTER')}
${codeMultiline(`${after.title}\n\n${after.body}`)}`,
		filter: (origin, _before, _after, by) => origin.id === by.guild.id,
		color: configuration.responses.colors.blue,
	},
	'articleLock': {
		title: 'Article locked',
		message: (article, by) =>
			`The article ${code(article.title)} has been locked by ${
				mentionUser(by.user)
			}.`,
		filter: (origin, _article, by) => origin.id === by.guild.id,
		color: configuration.responses.colors.yellow,
	},
};

export default generators;
export type { GuildEvents };
