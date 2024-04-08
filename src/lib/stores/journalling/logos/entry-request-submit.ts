import { getLocaleByLocalisationLanguage } from "logos:constants/languages";
import { codeMultiline } from "logos:core/formatting";
import { Guild } from "logos/database/guild";
import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"entryRequestSubmit"> = async (client, user, entryRequest) => {
	const guildDocument = await Guild.getOrCreate(client, { guildId: entryRequest.guildId });

	const guildLanguage = guildDocument.localisationLanguage;
	const guildLocale = getLocaleByLocalisationLanguage(guildLanguage);
	const featureLanguage = guildDocument.featureLanguage;

	const strings = {
		reason: client.localise("verification.fields.reason", guildLocale)({ language: featureLanguage }),
		aim: client.localise("verification.fields.aim", guildLocale)(),
		whereFound: client.localise("verification.fields.whereFound", guildLocale)(),
	};

	return {
		embeds: [
			{
				title: `${constants.emojis.events.entryRequest.submitted} Entry request submitted`,
				colour: constants.colours.success,
				description: `${client.diagnostics.user(user)} has submitted a request to join the server.

        **${strings.reason}**
        ${codeMultiline(entryRequest.formData.reason)}
        **${strings.aim}**
        ${codeMultiline(entryRequest.formData.aim)}
        **${strings.whereFound}**
        ${codeMultiline(entryRequest.formData.whereFound)}`,
			},
		],
	};
};

export default logger;
