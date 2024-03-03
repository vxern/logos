import diagnostics from "../../../../diagnostics";
import { codeMultiline, mention } from "../../../../formatting";
import { ClientEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.message.updated} Message updated`,
	message: (client, message, _) => {
		const oldMessage = client.entities.messages.previous.get(message.id);
		if (oldMessage === undefined) {
			return;
		}

		const author = client.entities.users.get(message.author.id);
		if (author === undefined) {
			return;
		}

		const before = oldMessage !== undefined ? codeMultiline(oldMessage.content) : "*No message*";

		return `${diagnostics.display.user(author)} updated their message in ${mention(message.channelId, {
			type: "channel",
		})}.

**BEFORE**
${before}
**AFTER**
${codeMultiline(message.content)}`;
	},
	filter: (client, originGuildId, message, oldMessage) => {
		const author = client.entities.users.get(message.author.id);
		if (author === undefined) {
			return false;
		}

		return originGuildId === message.guildId && !author.bot && message.content !== oldMessage?.content;
	},
	color: constants.colors.blue,
} satisfies MessageGenerators<ClientEvents>["messageUpdate"];
