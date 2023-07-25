import constants from "../../../../constants/constants";
import { MentionTypes, codeMultiline, mention } from "../../../../formatting";
import { diagnosticMentionUser } from "../../../utils";
import { ClientEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.message.updated} Message updated`,
	message: (client, _, message, __) => {
		const oldMessage = client.cache.messages.previous.get(message.id);
		if (oldMessage === undefined) {
			return;
		}

		const author = client.cache.users.get(message.authorId);
		if (author === undefined) {
			return;
		}

		const before = oldMessage !== undefined ? codeMultiline(oldMessage.content) : "*No message*";

		return `${diagnosticMentionUser(author)} updated their message in ${mention(
			message.channelId,
			MentionTypes.Channel,
		)}.

**BEFORE**
${before}
**AFTER**
${codeMultiline(message.content)}`;
	},
	filter: (client, originGuildId, _, message, oldMessage) => {
		const author = client.cache.users.get(message.authorId);
		if (author === undefined) {
			return false;
		}

		return originGuildId === message.guildId && !author.toggles.bot && message.content !== oldMessage?.content;
	},
	color: constants.colors.blue,
} satisfies MessageGenerators<ClientEvents>["messageUpdate"];
