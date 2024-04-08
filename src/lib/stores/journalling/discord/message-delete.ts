import { codeMultiline, mention } from "logos:core/formatting";
import { Client } from "logos/client";
import { EventLogger } from "logos/stores/journalling/logger";

class MessageDeleteEventLogger extends EventLogger<"messageDelete"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.message.deleted} Message deleted`,
			colour: constants.colours.red,
		});
	}

	buildMessage(
		payload: { id: bigint; channelId: bigint; guildId?: bigint | undefined },
		_?: Discord.Message | undefined,
	): string | undefined {
		const message = this.client.entities.messages.latest.get(payload.id);
		if (message === undefined) {
			return undefined;
		}

		const author = this.client.entities.users.get(message.author.id);
		if (author === undefined) {
			return undefined;
		}

		return `${this.client.diagnostics.user(author)} deleted their message in ${mention(message.channelId, {
			type: "channel",
		})}.

**CONTENT**
${codeMultiline(message.content)}`;
	}
}

export { MessageDeleteEventLogger };
