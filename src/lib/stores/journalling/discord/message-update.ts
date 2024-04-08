import { codeMultiline, mention } from "logos:core/formatting";
import { Client } from "logos/client";
import { EventLogger } from "logos/stores/journalling/logger";

class MessageUpdateEventLogger extends EventLogger<"messageUpdate"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.message.updated} Message updated`,
			colour: constants.colours.blue,
		});
	}

	filter(originGuildId: bigint, message: Discord.Message, oldMessage?: Discord.Message | undefined): boolean {
		const author = this.client.entities.users.get(message.author.id);
		if (author === undefined) {
			return false;
		}

		return originGuildId === message.guildId && !author.bot && message.content !== oldMessage?.content;
	}

	buildMessage(message: Discord.Message, _?: Discord.Message | undefined): string | undefined {
		const oldMessage = this.client.entities.messages.previous.get(message.id);
		if (oldMessage === undefined) {
			return undefined;
		}

		const author = this.client.entities.users.get(message.author.id);
		if (author === undefined) {
			return undefined;
		}

		return `${this.client.diagnostics.user(author)} updated their message in ${mention(message.channelId, {
			type: "channel",
		})}.

**BEFORE**
${codeMultiline(oldMessage.content)}
**AFTER**
${codeMultiline(message.content)}`;
	}
}

export { MessageUpdateEventLogger };
