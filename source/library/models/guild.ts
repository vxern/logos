import type { FeatureLanguage } from "logos:constants/languages/feature";
import type { LocalisationLanguage } from "logos:constants/languages/localisation";
import type { Client } from "logos/client";
import { GuildStatistics } from "logos/models/guild-statistics";
import { type IdentifierData, Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";
// biome-ignore lint/nursery/noExportedImports: The re-export of `RateLimit` is okay for now.
import type { GuildDocument, RateLimit } from "logos/models/versions/guild/latest.ts";

type Enabled<T> = T & { enabled: true };

type CreateGuildOptions = GuildDocument & IdentifierData<Guild>;

// biome-ignore lint/correctness/noUnusedVariables: Used for merging declarations.
interface Guild extends GuildDocument {}

/** @since v3.0.0 */
class Guild extends Model<{ collection: "Guilds"; idParts: ["guildId"] }> {
	readonly createdAt: number;

	get guildId(): string {
		return this.idParts[0];
	}

	get localisationLanguage(): LocalisationLanguage {
		return this.languages?.localisation ?? constants.defaults.LOCALISATION_LANGUAGE;
	}

	get targetLanguage(): LocalisationLanguage {
		return this.languages?.target ?? this.localisationLanguage;
	}

	get featureLanguage(): FeatureLanguage {
		return this.languages?.feature ?? constants.defaults.FEATURE_LANGUAGE;
	}

	get informationFeatures(): NonNullable<GuildFeatures["information"]>["features"] | undefined {
		if (!this.features?.information?.enabled) {
			return undefined;
		}

		return this.features.information.features;
	}

	get journalling(): Enabled<NonNullable<Guild["informationFeatures"]>["journaling"]> | undefined {
		const informationFeatures = this.informationFeatures;
		if (!informationFeatures?.journaling?.enabled) {
			return undefined;
		}

		return informationFeatures.journaling;
	}

	get noticeFeatures(): NonNullable<NonNullable<Guild["informationFeatures"]>["notices"]>["features"] | undefined {
		const informationFeatures = this.informationFeatures;
		if (!informationFeatures?.notices?.enabled) {
			return undefined;
		}

		return informationFeatures.notices?.features;
	}

	get informationNotice(): Enabled<NonNullable<Guild["noticeFeatures"]>["information"]> | undefined {
		const noticeFeatures = this.noticeFeatures;
		if (!noticeFeatures?.information?.enabled) {
			return undefined;
		}

		return noticeFeatures.information;
	}

	get resourceNotice(): Enabled<NonNullable<Guild["noticeFeatures"]>["resources"]> | undefined {
		const noticeFeatures = this.noticeFeatures;
		if (!noticeFeatures?.resources?.enabled) {
			return undefined;
		}

		return noticeFeatures.resources;
	}

	get roleNotice(): Enabled<NonNullable<Guild["noticeFeatures"]>["roles"]> | undefined {
		const noticeFeatures = this.noticeFeatures;
		if (!noticeFeatures?.roles?.enabled) {
			return undefined;
		}

		return noticeFeatures.roles;
	}

	get welcomeNotice(): Enabled<NonNullable<Guild["noticeFeatures"]>["welcome"]> | undefined {
		const noticeFeatures = this.noticeFeatures;
		if (!noticeFeatures?.welcome?.enabled) {
			return undefined;
		}

		return noticeFeatures.welcome;
	}

	get languageFeatures(): NonNullable<GuildFeatures["language"]>["features"] | undefined {
		if (!this.features?.language?.enabled) {
			return undefined;
		}

		return this.features.language.features;
	}

	get answers(): Enabled<NonNullable<Guild["languageFeatures"]>["answers"]> | undefined {
		const languageFeatures = this.languageFeatures;
		if (!languageFeatures?.answers?.enabled) {
			return undefined;
		}

		return languageFeatures.answers;
	}

	get corrections(): Enabled<NonNullable<Guild["languageFeatures"]>["corrections"]> | undefined {
		const languageFeatures = this.languageFeatures;
		if (!languageFeatures?.corrections?.enabled) {
			return undefined;
		}

		return languageFeatures.corrections;
	}

	get cefr(): Enabled<NonNullable<Guild["languageFeatures"]>["cefr"]> | undefined {
		const languageFeatures = this.languageFeatures;
		if (!languageFeatures?.cefr?.enabled) {
			return undefined;
		}

		return languageFeatures.cefr;
	}

	get game(): Enabled<NonNullable<Guild["languageFeatures"]>["game"]> | undefined {
		const languageFeatures = this.languageFeatures;
		if (!languageFeatures?.game?.enabled) {
			return undefined;
		}

		return languageFeatures.game;
	}

	get resources(): Enabled<NonNullable<Guild["languageFeatures"]>["resources"]> | undefined {
		const languageFeatures = this.languageFeatures;
		if (!languageFeatures?.resources?.enabled) {
			return undefined;
		}

		return languageFeatures.resources;
	}

	get translate(): Enabled<NonNullable<Guild["languageFeatures"]>["translate"]> | undefined {
		const languageFeatures = this.languageFeatures;
		if (!languageFeatures?.translate?.enabled) {
			return undefined;
		}

		return languageFeatures.translate;
	}

	get word(): Enabled<NonNullable<Guild["languageFeatures"]>["word"]> | undefined {
		const languageFeatures = this.languageFeatures;
		if (!languageFeatures?.word?.enabled) {
			return undefined;
		}

		return languageFeatures.word;
	}

	get context(): Enabled<NonNullable<Guild["languageFeatures"]>["context"]> | undefined {
		const languageFeatures = this.languageFeatures;
		if (!languageFeatures?.context?.enabled) {
			return undefined;
		}

		return languageFeatures.context;
	}

	get targetOnly(): Enabled<NonNullable<Guild["languageFeatures"]>["targetOnly"]> | undefined {
		const languageFeatures = this.languageFeatures;
		if (!languageFeatures?.targetOnly?.enabled) {
			return undefined;
		}

		return languageFeatures.targetOnly;
	}

	get roleLanguages(): Enabled<NonNullable<Guild["languageFeatures"]>["roleLanguages"]> | undefined {
		const languageFeatures = this.languageFeatures;
		if (!languageFeatures?.roleLanguages?.enabled) {
			return undefined;
		}

		return languageFeatures.roleLanguages;
	}

	get moderationFeatures(): NonNullable<GuildFeatures["moderation"]>["features"] | undefined {
		if (!this.features?.moderation?.enabled) {
			return undefined;
		}

		return this.features.moderation.features;
	}

	get alerts(): Enabled<NonNullable<Guild["moderationFeatures"]>["alerts"]> | undefined {
		const moderationFeatures = this.moderationFeatures;
		if (!moderationFeatures?.alerts?.enabled) {
			return undefined;
		}

		return moderationFeatures.alerts;
	}

	get policy(): Enabled<NonNullable<Guild["moderationFeatures"]>["policy"]> | undefined {
		const moderationFeatures = this.moderationFeatures;
		if (!moderationFeatures?.policy?.enabled) {
			return undefined;
		}

		return moderationFeatures.policy;
	}

	get rules(): Enabled<NonNullable<Guild["moderationFeatures"]>["rules"]> | undefined {
		const moderationFeatures = this.moderationFeatures;
		if (!moderationFeatures?.rules?.enabled) {
			return undefined;
		}

		return moderationFeatures.rules;
	}

	get purging(): Enabled<NonNullable<Guild["moderationFeatures"]>["purging"]> | undefined {
		const moderationFeatures = this.moderationFeatures;
		if (!moderationFeatures?.purging?.enabled) {
			return undefined;
		}

		return moderationFeatures.purging;
	}

	get slowmode(): Enabled<NonNullable<Guild["moderationFeatures"]>["slowmode"]> | undefined {
		const moderationFeatures = this.moderationFeatures;
		if (!moderationFeatures?.slowmode?.enabled) {
			return undefined;
		}

		return moderationFeatures.slowmode;
	}

	get timeouts(): Enabled<NonNullable<Guild["moderationFeatures"]>["timeouts"]> | undefined {
		const moderationFeatures = this.moderationFeatures;
		if (!moderationFeatures?.timeouts?.enabled) {
			return undefined;
		}

		return moderationFeatures.timeouts;
	}

	get warns(): Enabled<NonNullable<Guild["moderationFeatures"]>["warns"]> | undefined {
		const moderationFeatures = this.moderationFeatures;
		if (!moderationFeatures?.warns?.enabled) {
			return undefined;
		}

		return moderationFeatures.warns;
	}

	get reports(): Enabled<NonNullable<Guild["moderationFeatures"]>["reports"]> | undefined {
		const moderationFeatures = this.moderationFeatures;
		if (!moderationFeatures?.reports?.enabled) {
			return undefined;
		}

		return moderationFeatures.reports;
	}

	/** Relies on guild.features.server.tickets.categoryId */
	get verification(): Enabled<NonNullable<Guild["moderationFeatures"]>["verification"]> | undefined {
		const moderationFeatures = this.moderationFeatures;
		if (!moderationFeatures?.verification?.enabled) {
			return undefined;
		}

		return moderationFeatures.verification;
	}

	get serverFeatures(): NonNullable<GuildFeatures["server"]>["features"] | undefined {
		if (!this.features?.server?.enabled) {
			return undefined;
		}

		return this.features.server.features;
	}

	get dynamicVoiceChannels(): Enabled<NonNullable<Guild["serverFeatures"]>["dynamicVoiceChannels"]> | undefined {
		const serverFeatures = this.serverFeatures;
		if (!serverFeatures?.dynamicVoiceChannels?.enabled) {
			return undefined;
		}

		return serverFeatures.dynamicVoiceChannels;
	}

	get entry(): Enabled<NonNullable<Guild["serverFeatures"]>["entry"]> | undefined {
		const serverFeatures = this.serverFeatures;
		if (!serverFeatures?.entry?.enabled) {
			return undefined;
		}

		return serverFeatures.entry;
	}

	get roleIndicators(): Enabled<NonNullable<Guild["serverFeatures"]>["roleIndicators"]> | undefined {
		const serverFeatures = this.serverFeatures;
		if (!serverFeatures?.roleIndicators?.enabled) {
			return undefined;
		}

		return serverFeatures.roleIndicators;
	}

	get suggestions(): Enabled<NonNullable<Guild["serverFeatures"]>["suggestions"]> | undefined {
		const serverFeatures = this.serverFeatures;
		if (!serverFeatures?.suggestions?.enabled) {
			return undefined;
		}

		return serverFeatures.suggestions;
	}

	get resourceSubmissions(): Enabled<NonNullable<Guild["serverFeatures"]>["resources"]> | undefined {
		const serverFeatures = this.serverFeatures;
		if (!serverFeatures?.resources?.enabled) {
			return undefined;
		}

		return serverFeatures.resources;
	}

	get tickets(): Enabled<NonNullable<Guild["serverFeatures"]>["tickets"]> | undefined {
		const serverFeatures = this.serverFeatures;
		if (!serverFeatures?.tickets?.enabled) {
			return undefined;
		}

		return serverFeatures.tickets;
	}

	get socialFeatures(): NonNullable<GuildFeatures["social"]>["features"] | undefined {
		if (!this.features?.social?.enabled) {
			return undefined;
		}

		return this.features.social.features;
	}

	get music(): Enabled<NonNullable<Guild["socialFeatures"]>["music"]> | undefined {
		const socialFeatures = this.socialFeatures;
		if (!socialFeatures?.music?.enabled) {
			return undefined;
		}

		return socialFeatures.music;
	}

	get praises(): Enabled<NonNullable<Guild["socialFeatures"]>["praises"]> | undefined {
		const socialFeatures = this.socialFeatures;
		if (!socialFeatures?.praises?.enabled) {
			return undefined;
		}

		return socialFeatures.praises;
	}

	get profile(): Enabled<NonNullable<Guild["socialFeatures"]>["profile"]> | undefined {
		const socialFeatures = this.socialFeatures;
		if (!socialFeatures?.profile?.enabled) {
			return undefined;
		}

		return socialFeatures.profile;
	}

	constructor(database: DatabaseStore, { createdAt, languages, features, isNative, ...data }: CreateGuildOptions) {
		super(database, data, { collection: "Guilds" });

		this.createdAt = createdAt ?? Date.now();
		this.languages = languages;
		this.features = features;
		this.isNative = isNative ?? false;
	}

	static get(client: Client, data: IdentifierData<Guild>): Guild | Promise<Guild | undefined> | undefined {
		const partialId = Model.buildPartialId(data);
		if (client.documents.guilds.has(partialId)) {
			return client.documents.guilds.get(partialId)!;
		}

		return client.database.withSession((session) => {
			return session.get<Guild>(Model.buildId(data, { collection: "Guilds" }));
		});
	}

	static async create(client: Client, data: CreateGuildOptions): Promise<Guild> {
		const guildDocument = await client.database.withSession((session) => {
			return session.set(new Guild(client.database, data));
		});

		await GuildStatistics.getOrCreate(client, { guildId: guildDocument.id.toString() });

		return guildDocument;
	}

	static async getOrCreate(client: Client, data: CreateGuildOptions): Promise<Guild> {
		const guildDocument = await Guild.get(client, data);
		if (guildDocument !== undefined) {
			return guildDocument;
		}

		return Guild.create(client, data);
	}

	// TODO(vxern): Simplify checking for a feature being enabled.
	hasEnabled(feature: keyof Guild) {
		return this[feature] !== undefined;
	}

	// TODO(vxern): Create method to check for a feature being journalled.

	// TODO(vxern): Create method to check for rate limits.

	// TODO(vxern): Create method to check for management over a feature.

	isTargetLanguageOnly(channelId: string): boolean {
		return this.targetOnly?.channelIds?.includes(channelId) ?? false;
	}
}

export { Guild };
export type { CreateGuildOptions, RateLimit };
