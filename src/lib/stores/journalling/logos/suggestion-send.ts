import { Client } from "logos/client";
import { Suggestion } from "logos/database/suggestion";
import { EventLogger } from "logos/stores/journalling/logger";

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

		return `${this.client.diagnostics.user(memberUser)} has made a suggestion.\n\nSuggestion: *${
			suggestion.formData.suggestion
		}*`;
	}
}

export { SuggestionSendEventLogger };
