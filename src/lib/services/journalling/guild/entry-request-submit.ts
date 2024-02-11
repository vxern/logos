import constants from "../../../../constants/constants";
import { getLocaleByLocalisationLanguage } from "../../../../constants/languages";
import { codeMultiline } from "../../../../formatting";
import { Guild } from "../../../database/guild";
import diagnostics from "../../../diagnostics";
import { getFeatureLanguage, getLocalisationLanguage } from "../../../interactions";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.entryRequest.submitted} Entry request submitted`,
	message: async (client, user, entryRequest) => {
		const session = client.database.openSession();

		const guildDocument =
			client.documents.guilds.get(entryRequest.guildId) ??
			(await session.get<Guild>(`guilds/${entryRequest.guildId}`).then((value) => value ?? undefined));

		session.dispose();

		if (guildDocument === undefined) {
			return;
		}

		const guildLanguage = getLocalisationLanguage(guildDocument);
		const guildLocale = getLocaleByLocalisationLanguage(guildLanguage);
		const featureLanguage = getFeatureLanguage(guildDocument);

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
