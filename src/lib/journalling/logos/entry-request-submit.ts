import { getLocaleByLocalisationLanguage } from "../../../constants/languages";
import diagnostics from "../../../diagnostics";
import { codeMultiline } from "../../../formatting";
import { Client } from "../../client";
import { EntryRequest } from "../../database/entry-request";
import { Guild } from "../../database/guild";
import { EventLogger } from "../logger";

class EntryRequestSubmitEventLogger extends EventLogger<"entryRequestSubmit"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.symbols.events.entryRequest.submitted} Entry request submitted`,
			colour: constants.colors.lightGreen,
		});
	}

	filter(originGuildId: bigint, _: Logos.User, entryRequest: EntryRequest): boolean {
		const guild = this.client.entities.guilds.get(BigInt(entryRequest.guildId));
		if (guild === undefined) {
			return false;
		}

		return originGuildId === guild.id;
	}

	async message(user: Logos.User, entryRequest: EntryRequest): Promise<string> {
		const guildDocument = await Guild.getOrCreate(this.client, { guildId: entryRequest.guildId });

		const guildLanguage = guildDocument.localisationLanguage;
		const guildLocale = getLocaleByLocalisationLanguage(guildLanguage);
		const featureLanguage = guildDocument.featureLanguage;

		const strings = {
			reason: this.client.localise("verification.fields.reason", guildLocale)({ language: featureLanguage }),
			aim: this.client.localise("verification.fields.aim", guildLocale)(),
			whereFound: this.client.localise("verification.fields.whereFound", guildLocale)(),
		};

		return `${diagnostics.display.user(user)} has submitted a request to join the server.

**${strings.reason}**
${codeMultiline(entryRequest.answers.reason)}
**${strings.aim}**
${codeMultiline(entryRequest.answers.aim)}
**${strings.whereFound}**
${codeMultiline(entryRequest.answers.whereFound)}`;
	}
}

export { EntryRequestSubmitEventLogger };
