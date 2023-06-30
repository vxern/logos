import { EntryRequest } from "../../database/structs/entry-request.js";
import { Praise } from "../../database/structs/praise.js";
import { Report } from "../../database/structs/report.js";
import { Suggestion } from "../../database/structs/suggestion.js";
import { Warning } from "../../database/structs/warning.js";
import { Channel, Member, User } from "discordeno";

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

export type { GuildEvents };
