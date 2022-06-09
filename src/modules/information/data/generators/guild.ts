import { Guild, Member, User } from '../../../../../deps.ts';
import configuration from '../../../../configuration.ts';
import { Article } from '../../../../database/structs/article.ts';
import { bold, codeMultiline } from '../../../../formatting.ts';
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
	articleAdd: [article: Article];

	/** An article has been edited. */
	articleUpdate: [article: Article];

	/** An article has been locked. */
	articleLock: [article: Article];
};

/** Contains the message generators for (custom) guild events. */
const generators: MessageGenerators<GuildEvents> = {
	'verificationRequestAccept': {
		title: 'Verification request accepted',
		message: (user: User, by: Member) =>
			`${mentionUser(user)}'s verification request has been accepted by ${
				mentionUser(by.user)
			}`,
		filter: (origin: Guild, _, by: Member) => origin.id === by.guild.id,
		color: configuration.responses.colors.green,
	},
	'verificationRequestReject': {
		title: 'Verification request rejected',
		message: (user: User, by: Member) =>
			`${mentionUser(user)}'s verification request has been rejected by ${
				mentionUser(by.user)
			}`,
		filter: (origin: Guild, _, by: Member) => origin.id === by.guild.id,
		color: configuration.responses.colors.red,
	},
	'entryRequestAccept': {
		title: 'Entry granted',
		message: (member: Member) =>
			`Entry has been granted to ${mentionUser(member.user)}.`,
		filter: (origin: Guild, member: Member) => origin.id === member.guild.id,
		color: configuration.responses.colors.green,
	},
	'entryRequestReject': {
		title: 'Entry refused',
		message: (member: Member, reason: string) =>
			`Entry has been refused to ${mentionUser(member.user)}.

${bold('REASON')}
${codeMultiline(reason)}`,
		filter: (origin: Guild, member: Member, _) => origin.id === member.guild.id,
		color: configuration.responses.colors.green,
	},
};

export default generators;
export type { GuildEvents };
