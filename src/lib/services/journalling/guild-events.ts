import * as Logos from "../../../types";
import { EntryRequest } from "../../database/structs/entry-request";
import { Praise } from "../../database/structs/praise";
import { Report } from "../../database/structs/report";
import { Suggestion } from "../../database/structs/suggestion";
import { Warning } from "../../database/structs/warning";

/** Type representing events that occur within a guild. */
type GuildEvents = {
	/** An entry request has been submitted. */
	entryRequestSubmit: [user: Logos.User, entryRequest: EntryRequest];

	/** An entry request has been accepted. */
	entryRequestAccept: [user: Logos.User, by: Logos.Member];

	/** An entry request has been rejected. */
	entryRequestReject: [user: Logos.User, by: Logos.Member];

	/** A member has been warned. */
	memberWarnAdd: [member: Logos.Member, warning: Warning, by: Logos.User];

	/** A member has had a warning removed from their account. */
	memberWarnRemove: [member: Logos.Member, warning: Warning, by: Logos.User];

	/** A member has been timed out. */
	memberTimeoutAdd: [member: Logos.Member, until: number, reason: string, by: Logos.User];

	/** A member's timeout has been cleared. */
	memberTimeoutRemove: [member: Logos.Member, by: Logos.User];

	/** A member has been praised. */
	praiseAdd: [member: Logos.Member, praise: Praise, by: Logos.User];

	/** A suggestion has been made. */
	suggestionSend: [member: Logos.Member, suggestion: Suggestion];

	/** A report has been submitted. */
	reportSubmit: [author: Logos.Member, report: Report];

	/** A purging of messages has been initiated. */
	purgeBegin: [member: Logos.Member, channel: Logos.Channel, messageCount: number, author?: Logos.User];

	/** A purging of messages is complete. */
	purgeEnd: [member: Logos.Member, channel: Logos.Channel, messageCount: number, author?: Logos.User];
};

export type { GuildEvents };
