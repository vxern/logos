import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"suggestionSend"> = async (client, [member, suggestion], { guildLocale }) => {
	const strings = constants.contexts.suggestionSend({ localise: client.localise, locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.suggestion} ${strings.title}`,
				color: constants.colours.success,
				description: strings.description({ user: client.diagnostics.member(member) }),
				fields: [
					{
						name: strings.fields.suggestion,
						value: suggestion.formData.suggestion,
					},
				],
			},
		],
	};
};

export default logger;
