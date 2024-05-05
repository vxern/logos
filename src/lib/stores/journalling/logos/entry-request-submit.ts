import { getLocaleByLocalisationLanguage } from "logos:constants/languages";
import { codeMultiline } from "logos:core/formatting";
import { Guild } from "logos/database/guild";
import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"entryRequestSubmit"> = async (client, user, entryRequest) => {
	const guildDocument = await Guild.getOrCreate(client, { guildId: entryRequest.guildId });

	const guildLanguage = guildDocument.localisationLanguage;
	const guildLocale = getLocaleByLocalisationLanguage(guildLanguage);
	const featureLanguage = guildDocument.featureLanguage;

	const strings = constants.contexts.verificationModal({ localise: client.localise, locale: guildLocale });

	return {
		embeds: [
			{
				title: `${constants.emojis.events.entryRequest.submitted} Entry request submitted`,
				colour: constants.colours.success,
				description: `${client.diagnostics.user(user)} has submitted a request to join the server.

        **${strings.fields.reason({ language: featureLanguage })}**
        ${codeMultiline(entryRequest.formData.reason)}
        **${strings.fields.aim}**
        ${codeMultiline(entryRequest.formData.aim)}
        **${strings.fields.whereFound}**
        ${codeMultiline(entryRequest.formData.whereFound)}`,
			},
		],
	};
};

export default logger;
