import { Channel, Member, User } from 'discordeno';
import { EntryRequest, Praise, Report, Suggestion, Warning } from 'logos/src/lib/database/structs/mod.ts';
import { MessageGenerators } from 'logos/src/lib/controllers/logging/generators/generators.ts';
import { localise } from 'logos/src/lib/client.ts';
import { diagnosticMentionUser } from 'logos/src/lib/utils.ts';
import constants from 'logos/src/constants.ts';
import { codeMultiline, mention, MentionTypes, timestamp } from 'logos/src/formatting.ts';
import { defaultLocale } from 'logos/src/types.ts';

/** Type representing events that occur within a guild. */
type GuildEvents = {
	/** An entry request has been submitted. */
	entryRequestSubmit: [user: User, entryRequest: EntryRequest];

	/** An entry request has been accepted. */
	entryRequestAccept: [user: User, by: Member];

	/** An entry request has been rejected. */
	entryRequestReject: [user: User, by: Member];

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
	suggestionSend: [member: Member, suggestion: Suggestion];

	/** A report has been submitted. */
	reportSubmit: [author: Member, report: Report];

	/** A purging of messages has been initiated. */
	purgeBegin: [member: Member, channel: Channel, messageCount: number, author?: User];

	/** A purging of messages is complete. */
	purgeEnd: [member: Member, channel: Channel, messageCount: number, author?: User];
};

/** Contains the message generators for (custom) guild events. */
const generators: Required<MessageGenerators<GuildEvents>> = {
	entryRequestSubmit: {
		title: `${constants.symbols.events.entryRequest.submitted} Entry request submitted`,
		message: (client, user, entryRequest) => {
			const guild = client.cache.guilds.get(BigInt(entryRequest.guild));
			if (guild === undefined) return;

			const strings = {
				reason: localise(client, 'verification.fields.reason', defaultLocale)({
					'language': guild.language,
				}),
				aim: localise(client, 'verification.fields.aim', defaultLocale)(),
				whereFound: localise(client, 'verification.fields.whereFound', defaultLocale)(),
			};

			return `${diagnosticMentionUser(user)} has submitted a request to join the server.

**${strings.reason}**
${codeMultiline(entryRequest.answers.reason!)}
**${strings.aim}**
${codeMultiline(entryRequest.answers.aim!)}
**${strings.whereFound}**
${codeMultiline(entryRequest.answers.where_found!)}
`;
		},
		filter: (client, originGuildId, _user, entryRequest) => {
			const guild = client.cache.guilds.get(BigInt(entryRequest.guild));
			if (guild === undefined) return false;

			return originGuildId === guild.id;
		},
		color: constants.colors.lightGreen,
	},
	entryRequestAccept: {
		title: `${constants.symbols.events.entryRequest.accepted} Entry request accepted`,
		message: (client, user, by) => {
			const byUser = client.cache.users.get(by.id);
			if (byUser === undefined) return;

			return `${diagnosticMentionUser(user)}'s entry request has been accepted by ${diagnosticMentionUser(byUser)}`;
		},
		filter: (_, originGuildId, __, by) => originGuildId === by.guildId,
		color: constants.colors.lightGreen,
	},
	entryRequestReject: {
		title: `${constants.symbols.events.entryRequest.rejected} Entry request rejected`,
		message: (client, user, by) => {
			const byUser = client.cache.users.get(by.id);
			if (byUser === undefined) return;

			return `${diagnosticMentionUser(user)}'s entry request has been rejected by ${diagnosticMentionUser(byUser)}`;
		},
		filter: (_, originGuildId, __, by) => originGuildId === by.guildId,
		color: constants.colors.red,
	},
	memberWarnAdd: {
		title: `${constants.symbols.events.warned} Member warned`,
		message: (client, member, warning, by) => {
			const memberUser = client.cache.users.get(member.id);
			if (memberUser === undefined) return;

			return `${diagnosticMentionUser(memberUser)} has been warned by ${
				diagnosticMentionUser(by)
			} for: ${warning.reason}`;
		},
		filter: (_, originGuildId, member, __, ___) => originGuildId === member.guildId,
		color: constants.colors.dullYellow,
	},
	memberWarnRemove: {
		title: `${constants.symbols.events.pardoned} Member pardoned`,
		message: (client, member, warning, by) => {
			const memberUser = client.cache.users.get(member.id);
			if (memberUser === undefined) return;

			return `${diagnosticMentionUser(memberUser)} has been pardoned by ${
				diagnosticMentionUser(by)
			} regarding their warning for: ${warning.reason}`;
		},
		filter: (_, originGuildId, member, __, ___) => originGuildId === member.guildId,
		color: constants.colors.blue,
	},
	memberTimeoutAdd: {
		title: `${constants.symbols.events.timeout.added} Member timed out`,
		message: (client, member, until, reason, by) => {
			const memberUser = client.cache.users.get(member.id);
			if (memberUser === undefined) return;

			return `${diagnosticMentionUser(memberUser)} has been timed out by ${diagnosticMentionUser(by)} until ${
				timestamp(until)
			} for: ${reason}`;
		},
		filter: (_, originGuildId, member, __, ___, ____) => originGuildId === member.guildId,
		color: constants.colors.dullYellow,
	},
	memberTimeoutRemove: {
		title: `${constants.symbols.events.timeout.removed} Member's timeout cleared`,
		message: (client, member, by) => {
			const memberUser = client.cache.users.get(member.id);
			if (memberUser === undefined) return;

			return `The timeout of ${diagnosticMentionUser(memberUser)} has been cleared by: ${diagnosticMentionUser(by)}`;
		},
		filter: (_, originGuildId, member, __) => originGuildId === member.guildId,
		color: constants.colors.blue,
	},
	praiseAdd: {
		title: `${constants.symbols.events.praised} Member praised`,
		message: (client, member, praise, by) => {
			const memberUser = client.cache.users.get(member.id);
			if (memberUser === undefined) return;

			const comment = praise.comment ?? 'None.';

			return `${diagnosticMentionUser(memberUser)} has been praised by ${
				diagnosticMentionUser(by)
			}. Comment: ${comment}`;
		},
		filter: (_client, originGuildId, member, _praise, _by) => originGuildId === member.guildId,
		color: constants.colors.lightGreen,
	},
	suggestionSend: {
		title: `${constants.symbols.events.suggestion} Suggestion made`,
		message: (client, member, suggestion) => {
			const memberUser = client.cache.users.get(member.id);
			if (memberUser === undefined) return;

			return `${diagnosticMentionUser(memberUser)} has made a suggestion.\n\n` +
				`Suggestion: *${suggestion.suggestion}*`;
		},
		filter: (_, originGuildId, member, __) => originGuildId === member.guildId,
		color: constants.colors.darkGreen,
	},
	reportSubmit: {
		title: `${constants.symbols.events.report} Report submitted`,
		message: (client, author, report) => {
			const authorUser = client.cache.users.get(author.id);
			if (authorUser === undefined) return;

			const messageLink = report.messageLink ?? '*No message link*.';

			return `${diagnosticMentionUser(authorUser)} has submitted a report.

**REASON**
${report.reason}

**REPORTED USERS**
${report.users}

**MESSAGE LINK**
${messageLink}`;
		},
		filter: (_, originGuildId, author, ___) => originGuildId === author.guildId,
		color: constants.colors.darkRed,
	},
	purgeBegin: {
		title: `${constants.symbols.events.purging.begin} Purging started`,
		message: (client, member, channel, messageCount, author) => {
			const user = client.cache.users.get(member.id);
			if (user === undefined) return;

			const userMention = diagnosticMentionUser(user);
			const authorMention = author !== undefined ? diagnosticMentionUser(author) : undefined;
			const channelMention = mention(channel.id, MentionTypes.Channel);

			return `${userMention} has initiated a purging of ${messageCount} messages${
				author !== undefined ? `sent by ${authorMention}` : ''
			} in ${channelMention}.`;
		},
		filter: (_, originGuildId, member, __, ___, ____) => originGuildId === member.guildId,
		color: constants.colors.yellow,
	},
	purgeEnd: {
		title: `${constants.symbols.events.purging.end} Purging complete`,
		message: (client, member, channel, messageCount, author) => {
			const user = client.cache.users.get(member.id);
			if (user === undefined) return;

			const userMention = diagnosticMentionUser(user);
			const authorMention = author !== undefined ? diagnosticMentionUser(author) : undefined;
			const channelMention = mention(channel.id, MentionTypes.Channel);

			return `The purging of ${messageCount} messages${
				author !== undefined ? `sent by ${authorMention}` : ''
			} in ${channelMention} initiated by ${userMention} is complete.`;
		},
		filter: (_, originGuildId, member, __, ___, ____) => originGuildId === member.guildId,
		color: constants.colors.lightGreen,
	},
};

export default generators;
export type { GuildEvents };
