import * as Logos from "../../../types";
import { SlowmodeLevel } from "../../commands/moderation/commands/slowmode";
import { EntryRequest } from "../../database/entry-request";
import { Praise } from "../../database/praise";
import { Report } from "../../database/report";
import { Resource } from "../../database/resource";
import { Suggestion } from "../../database/suggestion";
import { Ticket } from "../../database/ticket";
import { Warning } from "../../database/warning";

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

	/** A report has been submitted. */
	reportSubmit: [author: Logos.Member, report: Report];

	/** A resource has been submitted. */
	resourceSend: [member: Logos.Member, resource: Resource];

	/** A suggestion has been made. */
	suggestionSend: [member: Logos.Member, suggestion: Suggestion];

	/** A ticket has been opened. */
	ticketOpen: [member: Logos.Member, ticket: Ticket];

	/** An inquiry has been opened. */
	inquiryOpen: [member: Logos.Member, ticket: Ticket];

	/** A purging of messages has been initiated. */
	purgeBegin: [member: Logos.Member, channel: Logos.Channel, messageCount: number, author?: Logos.User];

	/** A purging of messages is complete. */
	purgeEnd: [member: Logos.Member, channel: Logos.Channel, messageCount: number, author?: Logos.User];

	/** A user has enabled slowmode in a channel. */
	slowmodeEnable: [user: Logos.User, channel: Logos.Channel, level: SlowmodeLevel];

	/** A user has disabled slowmode in a channel. */
	slowmodeDisable: [user: Logos.User, channel: Logos.Channel];

	/** A user has upgraded the slowmode level in a channel. */
	slowmodeUpgrade: [
		user: Logos.User,
		channel: Logos.Channel,
		previousLevel: SlowmodeLevel,
		currentLevel: SlowmodeLevel,
	];

	/** A user has downgraded the slowmode level in a channel. */
	slowmodeDowngrade: [
		user: Logos.User,
		channel: Logos.Channel,
		previousLevel: SlowmodeLevel,
		currentLevel: SlowmodeLevel,
	];
};

export type { GuildEvents };
