import constants from "../../../../constants/constants";
import { getLocaleByLocalisationLanguage } from "../../../../constants/languages";
import diagnostics from "../../../../diagnostics";
import { codeMultiline } from "../../../../formatting";
import { Guild } from "../../../database/guild";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.entryRequest.submitted} Entry request submitted`,
	message: async (client, user, entryRequest) => {
		const guildDocument = await Guild.getOrCreate(client, { guildId: entryRequest.guildId });

		const guildLanguage = guildDocument.localisationLanguage;
		const guildLocale = getLocaleByLocalisationLanguage(guildLanguage);
		const featureLanguage = guildDocument.featureLanguage;

		const strings = {
			reason: client.localise("verification.fields.reason", guildLocale)({ language: featureLanguage }),
			aim: client.localise("verification.fields.aim", guildLocale)(),
			whereFound: client.localise("verification.fields.whereFound", guildLocale)(),
		};

		return `${diagnostics.display.user(user)} has submitted a request to join the server.

**${strings.reason}**
${codeMultiline(entryRequest.answers.reason)}
**${strings.aim}**
${codeMultiline(entryRequest.answers.aim)}
**${strings.whereFound}**
${codeMultiline(entryRequest.answers.whereFound)}
`;
	},
	filter: (client, originGuildId, _user, entryRequest) => {
		const guild = client.entities.guilds.get(BigInt(entryRequest.guildId));
		if (guild === undefined) {
			return false;
		}

		return originGuildId === guild.id;
	},
	color: constants.colors.lightGreen,
} satisfies MessageGenerators<GuildEvents>["entryRequestSubmit"];
