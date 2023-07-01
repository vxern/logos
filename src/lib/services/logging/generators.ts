import guildBanAdd from "./client/guild-ban-add.js";
import guildBanRemove from "./client/guild-ban-remove.js";
import guildMemberAdd from "./client/guild-member-add.js";
import guildMemberRemove from "./client/guild-member-remove.js";
import messageDelete from "./client/message-delete.js";
import messageUpdate from "./client/message-update.js";
import entryRequestAccept from "./guild/entry-request-accept.js";
import entryRequestReject from "./guild/entry-request-reject.js";
import entryRequestSubmit from "./guild/entry-request-submit.js";
import memberTimeoutAdd from "./guild/member-timeout-add.js";
import memberTimeoutRemove from "./guild/member-timeout-remove.js";
import memberWarnAdd from "./guild/member-warn-add.js";
import memberWarnRemove from "./guild/member-warn-remove.js";
import praiseAdd from "./guild/praise-add.js";
import purgeBegin from "./guild/purge-begin.js";
import purgeEnd from "./guild/purge-end.js";
import reportSubmit from "./guild/report-submit.js";
import suggestionSend from "./guild/suggestion-send.js";

export default {
	client: {
		guildBanAdd,
		guildBanRemove,
		guildMemberAdd,
		guildMemberRemove,
		messageUpdate,
		messageDelete,
	},
	guild: {
		entryRequestAccept,
		entryRequestReject,
		entryRequestSubmit,
		memberTimeoutAdd,
		memberTimeoutRemove,
		memberWarnAdd,
		memberWarnRemove,
		praiseAdd,
		purgeBegin,
		purgeEnd,
		reportSubmit,
		suggestionSend,
	},
};
