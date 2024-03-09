import diagnostics from "../../../diagnostics";
import { codeMultiline, mention } from "../../../formatting";
import { Client } from "../../client";
import { EventLogger } from "../logger";

class MessageDeleteEventLogger extends EventLogger<"messageDelete"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.message.deleted} Message deleted`,
			colour: constants.colors.red,
		});
	}

	filter(
		originGuildId: bigint,
		payload: { id: bigint; channelId: bigint; guildId?: bigint | undefined },
		_?: Discord.Message | undefined,
	): boolean {
		const message = this.client.entities.messages.latest.get(payload.id);
		if (message === undefined) {
			return false;
		}

		const author = this.client.entities.users.get(message.author.id);
		if (author === undefined) {
			return false;
		}

		return originGuildId === message.guildId && !author.bot;
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

		return `${diagnostics.display.user(author)} deleted their message in ${mention(message.channelId, {
			type: "channel",
		})}.

**CONTENT**
${codeMultiline(message.content)}`;
	}
}

export { MessageDeleteEventLogger };
