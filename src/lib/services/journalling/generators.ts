import guildBanAdd from "./client/guild-ban-add";
import guildBanRemove from "./client/guild-ban-remove";
import guildMemberAdd from "./client/guild-member-add";
import guildMemberRemove from "./client/guild-member-remove";
import messageDelete from "./client/message-delete";
import messageUpdate from "./client/message-update";
import entryRequestAccept from "./guild/entry-request-accept";
import entryRequestReject from "./guild/entry-request-reject";
import entryRequestSubmit from "./guild/entry-request-submit";
import memberTimeoutAdd from "./guild/member-timeout-add";
import memberTimeoutRemove from "./guild/member-timeout-remove";
import memberWarnAdd from "./guild/member-warn-add";
import memberWarnRemove from "./guild/member-warn-remove";
import praiseAdd from "./guild/praise-add";
import purgeBegin from "./guild/purge-begin";
import purgeEnd from "./guild/purge-end";
import reportSubmit from "./guild/report-submit";
import suggestionSend from "./guild/suggestion-send";

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
