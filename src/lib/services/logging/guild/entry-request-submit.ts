import constants from "../../../../constants";
import { codeMultiline } from "../../../../formatting";
import { defaultLocale } from "../../../../types";
import { localise } from "../../../client";
import { diagnosticMentionUser } from "../../../utils";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.entryRequest.submitted} Entry request submitted`,
	message: (client, user, entryRequest) => {
		const guild = client.cache.guilds.get(BigInt(entryRequest.guild));
		if (guild === undefined) {
			return;
		}

		const strings = {
			reason: localise(
				client,
				"verification.fields.reason",
				defaultLocale,
			)({
				language: guild.language,
			}),
			aim: localise(client, "verification.fields.aim", defaultLocale)(),
			whereFound: localise(client, "verification.fields.whereFound", defaultLocale)(),
		};

		return `${diagnosticMentionUser(user)} has submitted a request to join the server.

**${strings.reason}**
${codeMultiline(entryRequest.answers.reason)}
**${strings.aim}**
${codeMultiline(entryRequest.answers.aim)}
**${strings.whereFound}**
${codeMultiline(entryRequest.answers.whereFound)}
`;
	},
	filter: (client, originGuildId, _user, entryRequest) => {
		const guild = client.cache.guilds.get(BigInt(entryRequest.guild));
		if (guild === undefined) {
			return false;
		}

		return originGuildId === guild.id;
	},
	color: constants.colors.lightGreen,
} satisfies MessageGenerators<GuildEvents>["entryRequestSubmit"];
