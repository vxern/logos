import { EntryRequest } from "../../database/structs/entry-request.js";
import { Praise } from "../../database/structs/praise.js";
import { Report } from "../../database/structs/report.js";
import { Suggestion } from "../../database/structs/suggestion.js";
import { Warning } from "../../database/structs/warning.js";
import * as Discord from "discordeno";

/** Type representing events that occur within a guild. */
type GuildEvents = {
	/** An entry request has been submitted. */
	entryRequestSubmit: [user: Discord.User, entryRequest: EntryRequest];

	/** An entry request has been accepted. */
	entryRequestAccept: [user: Discord.User, by: Discord.Member];

	/** An entry request has been rejected. */
	entryRequestReject: [user: Discord.User, by: Discord.Member];

	/** A member has been warned. */
	memberWarnAdd: [member: Discord.Member, warning: Warning, by: Discord.User];

	/** A member has had a warning removed from their account. */
	memberWarnRemove: [member: Discord.Member, warning: Warning, by: Discord.User];

	/** A member has been timed out. */
	memberTimeoutAdd: [member: Discord.Member, until: number, reason: string, by: Discord.User];

	/** A member's timeout has been cleared. */
	memberTimeoutRemove: [member: Discord.Member, by: Discord.User];

	/** A member has been praised. */
	praiseAdd: [member: Discord.Member, praise: Praise, by: Discord.User];

	/** A suggestion has been made. */
	suggestionSend: [member: Discord.Member, suggestion: Suggestion];

	/** A report has been submitted. */
	reportSubmit: [author: Discord.Member, report: Report];

	/** A purging of messages has been initiated. */
	purgeBegin: [member: Discord.Member, channel: Discord.Channel, messageCount: number, author?: Discord.User];

	/** A purging of messages is complete. */
	purgeEnd: [member: Discord.Member, channel: Discord.Channel, messageCount: number, author?: Discord.User];
};

export type { GuildEvents };
