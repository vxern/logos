import { codeMultiline } from "logos:core/formatting";
import type { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"entryRequestSubmit"> = (client, [user, entryRequest], { guildLocale, featureLanguage }) => {
	const strings = {
		...constants.contexts.verificationModal({ localise: client.localise.bind(client), locale: guildLocale }),
		...constants.contexts.entryRequestSubmit({ localise: client.localise.bind(client), locale: guildLocale }),
	};
	return {
		embeds: [
			{
				title: `${constants.emojis.events.entryRequest.submitted} ${strings.title}`,
				color: constants.colours.success,
				description: strings.description({ user: client.diagnostics.user(user) }),
				fields: [
					{
						name: strings.fields.reason({ language: featureLanguage }),
						value: codeMultiline(entryRequest.formData.reason),
					},
					{
						name: strings.fields.aim,
						value: codeMultiline(entryRequest.formData.aim),
					},
					{
						name: strings.fields.whereFound,
						value: codeMultiline(entryRequest.formData.whereFound),
					},
				],
			},
		],
	};
};

export default logger;