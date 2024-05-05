import { getLocaleByLocalisationLanguage } from "logos:constants/languages";
import { codeMultiline } from "logos:core/formatting";
import { Guild } from "logos/database/guild";
import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"entryRequestSubmit"> = async (client, user, entryRequest) => {
	const guildDocument = await Guild.getOrCreate(client, { guildId: entryRequest.guildId });

	const guildLanguage = guildDocument.localisationLanguage;
	const guildLocale = getLocaleByLocalisationLanguage(guildLanguage);
	const featureLanguage = guildDocument.featureLanguage;

	// TODO(vxern): This needs to be updated.
	const strings = constants.contexts.verificationModal({ localise: client.localise, locale: guildLocale });

	return {
		embeds: [
			{
				title: `${constants.emojis.events.entryRequest.submitted} ${strings.title}`,
				colour: constants.colours.success,
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
