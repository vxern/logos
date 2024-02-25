import * as Discord from "@discordeno/bot";
import { Locale, getLocaleByLocalisationLanguage } from "../../constants/languages";
import defaults from "../../defaults";
import * as Logos from "../../types";
import { Client, Logger } from "../client";
import { Guild } from "../database/guild";

type ServiceBase = {
	[K in keyof Discord.EventHandlers]: (..._: Parameters<Discord.EventHandlers[K]>) => Promise<void>;
};

abstract class Service implements ServiceBase {
	readonly log: Logger;
	readonly client: Client;

	constructor(client: Client, { identifier }: { identifier: string }) {
		this.log = Logger.create({ identifier, isDebug: client.environment.isDebug });
		this.client = client;
	}

	abstract start(): Promise<void>;
	abstract stop(): Promise<void>;

	async debug(..._: Parameters<ServiceBase["debug"]>) {}
	async applicationCommandPermissionsUpdate(..._: Parameters<ServiceBase["applicationCommandPermissionsUpdate"]>) {}
	async guildAuditLogEntryCreate(..._: Parameters<ServiceBase["guildAuditLogEntryCreate"]>) {}
	async automodRuleCreate(..._: Parameters<ServiceBase["automodRuleCreate"]>) {}
	async automodRuleUpdate(..._: Parameters<ServiceBase["automodRuleUpdate"]>) {}
	async automodRuleDelete(..._: Parameters<ServiceBase["automodRuleDelete"]>) {}
	async automodActionExecution(..._: Parameters<ServiceBase["automodActionExecution"]>) {}
	async threadCreate(..._: Parameters<ServiceBase["threadCreate"]>) {}
	async threadDelete(..._: Parameters<ServiceBase["threadDelete"]>) {}
	async threadMemberUpdate(..._: Parameters<ServiceBase["threadMemberUpdate"]>) {}
	async threadMembersUpdate(..._: Parameters<ServiceBase["threadMembersUpdate"]>) {}
	async threadUpdate(..._: Parameters<ServiceBase["threadUpdate"]>) {}
	async scheduledEventCreate(..._: Parameters<ServiceBase["scheduledEventCreate"]>) {}
	async scheduledEventUpdate(..._: Parameters<ServiceBase["scheduledEventUpdate"]>) {}
	async scheduledEventDelete(..._: Parameters<ServiceBase["scheduledEventDelete"]>) {}
	async scheduledEventUserAdd(..._: Parameters<ServiceBase["scheduledEventUserAdd"]>) {}
	async scheduledEventUserRemove(..._: Parameters<ServiceBase["scheduledEventUserRemove"]>) {}
	async ready(..._: Parameters<ServiceBase["ready"]>) {}
	async interactionCreate(..._: Parameters<ServiceBase["interactionCreate"]>) {}
	async integrationCreate(..._: Parameters<ServiceBase["integrationCreate"]>) {}
	async integrationDelete(..._: Parameters<ServiceBase["integrationDelete"]>) {}
	async integrationUpdate(..._: Parameters<ServiceBase["integrationUpdate"]>) {}
	async inviteCreate(..._: Parameters<ServiceBase["inviteCreate"]>) {}
	async inviteDelete(..._: Parameters<ServiceBase["inviteDelete"]>) {}
	async guildMemberAdd(..._: Parameters<ServiceBase["guildMemberAdd"]>) {}
	async guildMemberRemove(..._: Parameters<ServiceBase["guildMemberRemove"]>) {}
	async guildMemberUpdate(..._: Parameters<ServiceBase["guildMemberUpdate"]>) {}
	async guildStickersUpdate(..._: Parameters<ServiceBase["guildStickersUpdate"]>) {}
	async messageCreate(..._: Parameters<ServiceBase["messageCreate"]>) {}
	async messageDelete(..._: Parameters<ServiceBase["messageDelete"]>) {}
	async messageDeleteBulk(..._: Parameters<ServiceBase["messageDeleteBulk"]>) {}
	async messageUpdate(..._: Parameters<ServiceBase["messageUpdate"]>) {}
	async reactionAdd(..._: Parameters<ServiceBase["reactionAdd"]>) {}
	async reactionRemove(..._: Parameters<ServiceBase["reactionRemove"]>) {}
	async reactionRemoveEmoji(..._: Parameters<ServiceBase["reactionRemoveEmoji"]>) {}
	async reactionRemoveAll(..._: Parameters<ServiceBase["reactionRemoveAll"]>) {}
	async presenceUpdate(..._: Parameters<ServiceBase["presenceUpdate"]>) {}
	async voiceServerUpdate(..._: Parameters<ServiceBase["voiceServerUpdate"]>) {}
	async voiceStateUpdate(..._: Parameters<ServiceBase["voiceStateUpdate"]>) {}
	async channelCreate(..._: Parameters<ServiceBase["channelCreate"]>) {}
	async dispatchRequirements(..._: Parameters<ServiceBase["dispatchRequirements"]>) {}
	async channelDelete(..._: Parameters<ServiceBase["channelDelete"]>) {}
	async channelPinsUpdate(..._: Parameters<ServiceBase["channelPinsUpdate"]>) {}
	async channelUpdate(..._: Parameters<ServiceBase["channelUpdate"]>) {}
	async stageInstanceCreate(..._: Parameters<ServiceBase["stageInstanceCreate"]>) {}
	async stageInstanceDelete(..._: Parameters<ServiceBase["stageInstanceDelete"]>) {}
	async stageInstanceUpdate(..._: Parameters<ServiceBase["stageInstanceUpdate"]>) {}
	async guildEmojisUpdate(..._: Parameters<ServiceBase["guildEmojisUpdate"]>) {}
	async guildBanAdd(..._: Parameters<ServiceBase["guildBanAdd"]>) {}
	async guildBanRemove(..._: Parameters<ServiceBase["guildBanRemove"]>) {}
	async guildCreate(..._: Parameters<ServiceBase["guildCreate"]>) {}
	async guildDelete(..._: Parameters<ServiceBase["guildDelete"]>) {}
	async guildUnavailable(..._: Parameters<ServiceBase["guildUnavailable"]>) {}
	async guildUpdate(..._: Parameters<ServiceBase["guildUpdate"]>) {}
	async raw(..._: Parameters<ServiceBase["raw"]>) {}
	async roleCreate(..._: Parameters<ServiceBase["roleCreate"]>) {}
	async roleDelete(..._: Parameters<ServiceBase["roleDelete"]>) {}
	async roleUpdate(..._: Parameters<ServiceBase["roleUpdate"]>) {}
	async webhooksUpdate(..._: Parameters<ServiceBase["webhooksUpdate"]>) {}
	async botUpdate(..._: Parameters<ServiceBase["botUpdate"]>) {}
	async typingStart(..._: Parameters<ServiceBase["typingStart"]>) {}
	async threadListSync(..._: Parameters<ServiceBase["threadListSync"]>) {}
	async entitlementCreate(..._: Parameters<ServiceBase["entitlementCreate"]>) {}
	async entitlementUpdate(..._: Parameters<ServiceBase["entitlementUpdate"]>) {}
	async entitlementDelete(..._: Parameters<ServiceBase["entitlementDelete"]>) {}
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
			return defaults.LOCALISATION_LOCALE;
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

export { Service, GlobalService, LocalService, ServiceBase };
