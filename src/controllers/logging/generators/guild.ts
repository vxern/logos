import { Member, User } from 'discordeno';
import { ArticleChange } from 'logos/src/database/structs/articles/article-change.ts';
import { Article } from 'logos/src/database/structs/articles/article.ts';
import { Praise } from 'logos/src/database/structs/users/praise.ts';
import { Warning } from 'logos/src/database/structs/users/warning.ts';
import { MessageGenerators } from 'logos/src/controllers/logging/generators/generators.ts';
import { diagnosticMentionUser, trim } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { code, codeMultiline, displayTime } from 'logos/formatting.ts';

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

	/** An inquest has been started into a moderator. */
	moderatorInquestLaunch: [member: Member, by: User];

	/** A moderator has passed an inquest. */
	moderatorInquestPass: [member: Member, by: User];

	/** A moderator has failed an inquest. */
	moderatorInquestFail: [member: Member, by: User];

	/** A member has been warned. */
	memberWarnAdd: [member: Member, warning: Warning, by: User];

	/** A member has had a warning removed from their account. */
	memberWarnRemove: [member: Member, warning: Warning, by: User];

	/** A member has been timed out. */
	memberTimeoutAdd: [member: Member, until: number, reason: string, by: User];

	/** A member's timeout has been cleared. */
	memberTimeoutRemove: [member: Member, by: User];

	/** A member has been praised. */
	praiseAdd: [member: Member, praise: Praise, by: User];

	/** A suggestion has been made. */
	suggestionSend: [member: Member, suggestion: string];
};

/** Contains the message generators for (custom) guild events. */
const generators: Required<MessageGenerators<GuildEvents>> = {
	verificationRequestAccept: {
		title: '✔️ Verification request accepted',
		message: (client, user, by) => {
			const byUser = client.cache.users.get(by.id);
			if (!byUser) return;

			return `${diagnosticMentionUser(user)}'s verification request has been accepted by ${
				diagnosticMentionUser(byUser)
			}`;
		},
		filter: (_client, originGuildId, _user, by) => originGuildId === by.guildId,
		color: configuration.interactions.responses.colors.green,
	},
	verificationRequestReject: {
		title: '❌ Verification request rejected',
		message: (client, user, by) => {
			const byUser = client.cache.users.get(by.id);
			if (!byUser) return;

			return `${diagnosticMentionUser(user)}'s verification request has been rejected by ${
				diagnosticMentionUser(byUser)
			}`;
		},
		filter: (_client, originGuildId, _user, by) => originGuildId === by.guildId,
		color: configuration.interactions.responses.colors.red,
	},
	entryRequestAccept: {
		title: '✔️ Entry granted',
		message: (client, member) => {
			const user = client.cache.users.get(member.id);
			if (!user) return;

			return `Entry has been granted to ${diagnosticMentionUser(user)}.`;
		},
		filter: (_client, originGuildId, member) => originGuildId === member.guildId,
		color: configuration.interactions.responses.colors.green,
	},
	entryRequestReject: {
		title: '❌ Entry refused',
		message: (client, member, reason) => {
			const user = client.cache.users.get(member.id);
			if (!user) return;

			return `Entry has been refused to ${diagnosticMentionUser(user)}.

**REASON**
${codeMultiline(reason)}`;
		},
		filter: (_client, originGuildId, member, _reason) => originGuildId === member.guildId,
		color: configuration.interactions.responses.colors.green,
	},
	articleCreate: {
		title: '📜 Article created',
		message: (client, article, by) => {
			const user = client.cache.users.get(by.id);
			if (!user) return;

			return `An article has been created by ${diagnosticMentionUser(user)}:

**${article.content.title}**
        
${trim(article.content.body, 300)}`;
		},
		filter: (_client, originGuildId, _article, by) => originGuildId === by.guildId,
		color: configuration.interactions.responses.colors.green,
	},
	articleCreateAccept: {
		title: '✔️ Article verified',
		message: (client, article, by) => {
			const user = client.cache.users.get(by.id);
			if (!user) return;

			return `An article submission has been verified by ${diagnosticMentionUser(user)}:

**${article.content.title}**

${trim(article.content.body, 300)}`;
		},
		filter: (_client, originGuildId, _article, by) => originGuildId === by.guildId,
		color: configuration.interactions.responses.colors.green,
	},
	articleCreateReject: {
		title: '❌ Article rejected',
		message: (client, article, by) => {
			const user = client.cache.users.get(by.id);
			if (!user) return;

			return `An article submission has been rejected by ${diagnosticMentionUser(user)}:

**${article.content.title}**
        
${trim(article.content.body, 300)}`;
		},
		filter: (_client, originGuildId, _article, by) => originGuildId === by.guildId,
		color: configuration.interactions.responses.colors.red,
	},
	articleEdit: {
		title: '✍️ Article edited',
		message: (client, article, change, by) => {
			const user = client.cache.users.get(by.id);
			if (!user) return;

			return `The article ${code(article.content.title)} has been edited by ${diagnosticMentionUser(user)}:
  
**${change.content.title}**
  
${trim(change.content.body, 300)}`;
		},
		filter: (_client, originGuildId, _article, _change, by) => originGuildId === by.guildId,
		color: configuration.interactions.responses.colors.blue,
	},
	articleEditAccept: {
		title: '✔️ Article edit accepted',
		message: (client, _article, change, by) => {
			const user = client.cache.users.get(by.id);
			if (!user) return;

			return `An article edit has been verified by ${diagnosticMentionUser(user)}:

**${change.content.title}**

${trim(change.content.body, 300)}`;
		},
		filter: (_client, originGuildId, _article, _change, by) => originGuildId === by.guildId,
		color: configuration.interactions.responses.colors.green,
	},
	articleEditReject: {
		title: '❌ Article edit rejected',
		message: (client, _article, change, by) => {
			const user = client.cache.users.get(by.id);
			if (!user) return;

			return `An article edit has been rejected by ${diagnosticMentionUser(user)}:

**${change.content.title}**

${trim(change.content.body, 300)}`;
		},
		filter: (_client, originGuildId, _article, _change, by) => originGuildId === by.guildId,
		color: configuration.interactions.responses.colors.red,
	},
	articleLock: {
		title: '🔐 Article locked',
		message: (client, article, by) => {
			const user = client.cache.users.get(by.id);
			if (!user) return;

			return `The article ${code(article.content.title)} has been locked by ${diagnosticMentionUser(user)}.`;
		},
		filter: (_client, originGuildId, _article, by) => originGuildId === by.guildId,
		color: configuration.interactions.responses.colors.yellow,
	},
	moderatorInquestLaunch: {
		title: '❗ Inquest launched',
		message: (client, member, by) => {
			const memberUser = client.cache.users.get(member.id);
			if (!memberUser) return;

			return `An inquest has been launched into ${diagnosticMentionUser(memberUser)} by ${diagnosticMentionUser(by)}.`;
		},
		filter: (_client, originGuildId, member, _by) => originGuildId === member.guildId,
		color: configuration.interactions.responses.colors.darkRed,
	},
	moderatorInquestPass: {
		title: '✔️ Inquest resulted in acquittance',
		message: (client, member, by) => {
			const memberUser = client.cache.users.get(member.id);
			if (!memberUser) return;

			return `An inquest into ${diagnosticMentionUser(memberUser)} has been reviewed by ${
				diagnosticMentionUser(by)
			}, and resulted in a pass.`;
		},
		filter: (_client, originGuildId, member, _by) => originGuildId === member.guildId,
		color: configuration.interactions.responses.colors.green,
	},
	moderatorInquestFail: {
		title: '❌ Inquest resulted in failure',
		message: (client, member, by) => {
			const memberUser = client.cache.users.get(member.id);
			if (!memberUser) return;

			return `An inquest into ${diagnosticMentionUser(memberUser)} has been reviewed by ${
				diagnosticMentionUser(by)
			}, and resulted in a failure.`;
		},
		filter: (_client, originGuildId, member, _by) => originGuildId === member.guildId,
		color: configuration.interactions.responses.colors.red,
	},
	memberWarnAdd: {
		title: '⚠️ Member warned',
		message: (client, member, warning, by) => {
			const memberUser = client.cache.users.get(member.id);
			if (!memberUser) return;

			return `${diagnosticMentionUser(memberUser)} has been warned by ${
				diagnosticMentionUser(by)
			} for: ${warning.reason}`;
		},
		filter: (_client, originGuildId, member, _warning, _by) => originGuildId === member.guildId,
		color: configuration.interactions.responses.colors.yellow,
	},
	memberWarnRemove: {
		title: '😇 Member pardoned',
		message: (client, member, warning, by) => {
			const memberUser = client.cache.users.get(member.id);
			if (!memberUser) return;

			return `${diagnosticMentionUser(memberUser)} has been pardoned by ${
				diagnosticMentionUser(by)
			} regarding their warning for: ${warning.reason}`;
		},
		filter: (_client, originGuildId, member, _warning, _by) => originGuildId === member.guildId,
		color: configuration.interactions.responses.colors.blue,
	},
	memberTimeoutAdd: {
		title: '⏳ Member timed out',
		message: (client, member, until, reason, by) => {
			const memberUser = client.cache.users.get(member.id);
			if (!memberUser) return;

			return `${diagnosticMentionUser(memberUser)} has been timed out by ${diagnosticMentionUser(by)} until ${
				displayTime(until)
			} for: ${reason}`;
		},
		filter: (_client, originGuildId, member, _until, _reason, _by) => originGuildId === member.guildId,
		color: configuration.interactions.responses.colors.yellow,
	},
	memberTimeoutRemove: {
		title: `😇 Member's timeout cleared`,
		message: (client, member, by) => {
			const memberUser = client.cache.users.get(member.id);
			if (!memberUser) return;

			return `The timeout of ${diagnosticMentionUser(memberUser)} has been cleared by: ${diagnosticMentionUser(by)}`;
		},
		filter: (_client, originGuildId, member, _by) => originGuildId === member.guildId,
		color: configuration.interactions.responses.colors.blue,
	},
	praiseAdd: {
		title: `🙏 Member praised`,
		message: (client, member, praise, by) => {
			const memberUser = client.cache.users.get(member.id);
			if (!memberUser) return;

			return `${diagnosticMentionUser(memberUser)} has been praised by ${diagnosticMentionUser(by)}. Comment: ${
				praise.comment ?? 'None.'
			}`;
		},
		filter: (_client, originGuildId, member, _praise, _by) => originGuildId === member.guildId,
		color: configuration.interactions.responses.colors.green,
	},
	suggestionSend: {
		title: `🌿 Suggestion made`,
		message: (client, member, suggestion) => {
			const memberUser = client.cache.users.get(member.id);
			if (!memberUser) return;

			return `${diagnosticMentionUser(memberUser)} has made a suggestion.\n\n` +
				`Suggestion: *${suggestion}*`;
		},
		filter: (_client, originGuildId, member, _suggestion) => originGuildId === member.guildId,
		color: configuration.interactions.responses.colors.darkGreen,
	},
};

export default generators;
export type { GuildEvents };
