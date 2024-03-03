import diagnostics from "../../../../diagnostics";
import { codeMultiline, mention } from "../../../../formatting";
import { Client } from "../../../client";
import { EventLogger } from "../logger";

class MessageUpdateEventLogger extends EventLogger<"messageUpdate"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.symbols.events.message.updated} Message updated`,
			colour: constants.colors.blue,
		});
	}

	filter(originGuildId: bigint, message: Discord.Message, oldMessage?: Discord.Message | undefined): boolean {
		const author = this.client.entities.users.get(message.author.id);
		if (author === undefined) {
			return false;
		}

		return originGuildId === message.guildId && !author.bot && message.content !== oldMessage?.content;
	}

	message(message: Discord.Message, _?: Discord.Message | undefined): string | undefined {
		const oldMessage = this.client.entities.messages.previous.get(message.id);
		if (oldMessage === undefined) {
			return undefined;
		}

		const author = this.client.entities.users.get(message.author.id);
		if (author === undefined) {
			return undefined;
		}

		const before = oldMessage !== undefined ? codeMultiline(oldMessage.content) : "*No message*";

		return `${diagnostics.display.user(author)} updated their message in ${mention(message.channelId, {
			type: "channel",
		})}.

**BEFORE**
${before}
**AFTER**
${codeMultiline(message.content)}`;
	}
}

export { MessageUpdateEventLogger };
