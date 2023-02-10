import { Member, User } from 'discordeno';
import { localise } from 'logos/assets/localisations/mod.ts';
import { Modals } from 'logos/assets/localisations/mod.ts';
import { EntryRequest, Praise, Report, Suggestion, Warning } from 'logos/src/database/structs/mod.ts';
import { MessageGenerators } from 'logos/src/controllers/logging/generators/generators.ts';
import { diagnosticMentionUser } from 'logos/src/utils.ts';
import constants from 'logos/constants.ts';
import { codeMultiline, timestamp } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

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
	reportSubmit: [author: Member, recipients: User[], report: Report];
};

/** Contains the message generators for (custom) guild events. */
const generators: Required<MessageGenerators<GuildEvents>> = {
	entryRequestSubmit: {
		title: `${constants.symbols.events.entryRequest.submitted} Entry request submitted`,
		message: (client, user, entryRequest) => {
			const guild = client.cache.guilds.get(BigInt(entryRequest.guild));
			if (guild === undefined) return;

			const reasonString = localise(Modals.verification.fields.reason, defaultLocale)(guild.language);
			const aimString = localise(Modals.verification.fields.aim, defaultLocale);
			const whereFoundString = localise(Modals.verification.fields.whereFound, defaultLocale)(guild.name);

			return `${diagnosticMentionUser(user)} has submitted a request to join the server.

**${reasonString}**
${codeMultiline(entryRequest.answers.reason!)}
**${aimString}**
${codeMultiline(entryRequest.answers.aim!)}
**${whereFoundString}**
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
		message: (client, author, recipients, report) => {
			const authorUser = client.cache.users.get(author.id);
			if (authorUser === undefined) return;

			const messageLink = report.messageLink ?? '*No message link*.';

			return `${diagnosticMentionUser(authorUser)} has submitted a report.

**REASON**
${report.reason}

**REPORTED USERS**
${recipients.map((recipient) => diagnosticMentionUser(recipient)).join(', ')}

**MESSAGE LINK**
${messageLink}`;
		},
		filter: (_, originGuildId, author, __, ___) => originGuildId === author.guildId,
		color: constants.colors.darkRed,
	},
};

export default generators;
export type { GuildEvents };
