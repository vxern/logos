import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"suggestionSend"> = async (client, member, suggestion) => ({
	embeds: [
		{
			title: `${constants.emojis.events.suggestion} Suggestion made`,
			color: constants.colours.success,
			description: `${client.diagnostics.member(member)} has made a suggestion.\n\nSuggestion: *${
				suggestion.formData.suggestion
			}*`,
		},
	],
});

export default logger;
