import { Locale, getLocaleByLocalisationLanguage } from "../../constants/languages";
import diagnostics from "../../diagnostics";
import { Client } from "../client";
import { Guild } from "../database/guild";
import { Logger } from "../logger";

abstract class Service {
	readonly log: Logger;
	readonly client: Client;

	constructor(client: Client, { identifier }: { identifier: string }) {
		this.log = Logger.create({ identifier: `Client/ServiceStore/${identifier}`, isDebug: client.environment.isDebug });
		this.client = client;
	}

	abstract start(): Promise<void>;
	abstract stop(): Promise<void>;
}

abstract class GlobalService extends Service {
	abstract start(): Promise<void>;
	abstract stop(): Promise<void>;
}

abstract class LocalService extends Service {
	readonly guildId: bigint;
	readonly guildIdString: string;

	get guild(): Logos.Guild | undefined {
		return this.client.entities.guilds.get(this.guildId);
	}

	get guildDocument(): Guild | undefined {
		return this.client.documents.guilds.get(this.guildIdString);
	}

	get guildLocale(): Locale {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return constants.defaults.LOCALISATION_LOCALE;
		}

		const guildLanguage = guildDocument.localisationLanguage;
		const guildLocale = getLocaleByLocalisationLanguage(guildLanguage);

		return guildLocale;
	}

	constructor(client: Client, { identifier, guildId }: { identifier: string; guildId: bigint }) {
		super(client, { identifier: `${identifier}@${guildId}` });

		this.guildId = guildId;
		this.guildIdString = guildId.toString();
	}

	abstract start(): Promise<void>;
	abstract stop(): Promise<void>;
}

// TODO(vxern): Better location for this?
async function getAllMessages(
	client: Client,
	channelId: bigint,
): Promise<Discord.CamelizedDiscordMessage[] | undefined> {
	const messages: Discord.CamelizedDiscordMessage[] = [];
	let isFinished = false;

	while (!isFinished) {
		const bufferUnoptimised = await client.bot.rest
			.getMessages(channelId, {
				limit: 100,
				before: messages.length === 0 ? undefined : messages.at(-1)?.id,
			})
			.catch(() => {
				client.log.warn(`Failed to get all messages from ${diagnostics.display.channel(channelId)}.`);
				return undefined;
			});
		if (bufferUnoptimised === undefined) {
			return undefined;
		}

		if (bufferUnoptimised.length < 100) {
			isFinished = true;
		}

		const buffer = bufferUnoptimised;

		messages.push(...buffer);
	}

	return messages;
}

export { Service, GlobalService, LocalService, getAllMessages };
