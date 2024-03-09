import diagnostics from "../../../diagnostics";
import { Client } from "../../client";
import { Suggestion } from "../../database/suggestion";
import { EventLogger } from "../logger";

class SuggestionSendEventLogger extends EventLogger<"suggestionSend"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.suggestion} Suggestion made`,
			colour: constants.colours.darkGreen,
		});
	}

	filter(originGuildId: bigint, member: Logos.Member, _: Suggestion): boolean {
		return originGuildId === member.guildId;
	}

	buildMessage(member: Logos.Member, suggestion: Suggestion): string | undefined {
		const memberUser = this.client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return undefined;
		}

		return `${diagnostics.display.user(memberUser)} has made a suggestion.\n\nSuggestion: *${
			suggestion.answers.suggestion
		}*`;
	}
}

export { SuggestionSendEventLogger };
