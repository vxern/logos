import { getLocaleByLocalisationLanguage } from "logos:constants/languages";
import { codeMultiline } from "logos:core/formatting";
import { Client } from "logos/client";
import { EntryRequest } from "logos/database/entry-request";
import { Guild } from "logos/database/guild";
import { EventLogger } from "logos/journalling/logger";

class EntryRequestSubmitEventLogger extends EventLogger<"entryRequestSubmit"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.entryRequest.submitted} Entry request submitted`,
			colour: constants.colours.lightGreen,
		});
	}

	filter(originGuildId: bigint, _: Logos.User, entryRequest: EntryRequest): boolean {
		const guild = this.client.entities.guilds.get(BigInt(entryRequest.guildId));
		if (guild === undefined) {
			return false;
		}

		return originGuildId === guild.id;
	}

	async buildMessage(user: Logos.User, entryRequest: EntryRequest): Promise<string> {
		const guildDocument = await Guild.getOrCreate(this.client, { guildId: entryRequest.guildId });

		const guildLanguage = guildDocument.localisationLanguage;
		const guildLocale = getLocaleByLocalisationLanguage(guildLanguage);
		const featureLanguage = guildDocument.featureLanguage;

		const strings = {
			reason: this.client.localise("verification.fields.reason", guildLocale)({ language: featureLanguage }),
			aim: this.client.localise("verification.fields.aim", guildLocale)(),
			whereFound: this.client.localise("verification.fields.whereFound", guildLocale)(),
		};

		return `${this.client.diagnostics.user(user)} has submitted a request to join the server.

**${strings.reason}**
${codeMultiline(entryRequest.formData.reason)}
**${strings.aim}**
${codeMultiline(entryRequest.formData.aim)}
**${strings.whereFound}**
${codeMultiline(entryRequest.formData.whereFound)}`;
	}
}

export { EntryRequestSubmitEventLogger };
