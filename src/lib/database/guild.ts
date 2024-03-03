import { FeatureLanguage, LearningLanguage, LocalisationLanguage } from "../../constants/languages";
import { TimeUnit } from "../../constants/time";
import { Client } from "../client";
import { IdentifierData, MetadataOrIdentifierData, Model } from "./model";

/** @since v3.5.0 */
interface GuildLanguages {
	/** @since v3.5.0 */
	readonly localisation: LocalisationLanguage;
	/** @since v3.8.0 */
	readonly target?: LearningLanguage;
	/** @since v3.5.0 */
	readonly feature: FeatureLanguage;
}

/** The bot's features configured for the guild. */
/** @since v3.0.0 */
interface GuildFeatures {
	/** Information section of features. */
	information: Activatable<{
		/** Features part of the information section. */
		features: {
			/** Logging events on the server. */
			journaling?: Activatable<{
				/** The ID of the channel the events will be logged to. */
				channelId: string;
			}>;

			/** Informational notices. */
			notices?: Activatable<{
				features: {
					information?: Activatable<{
						channelId: string;
						inviteLink: string;
					}>;

					/** @since v3.28.0 */
					/** Relies on guild.features.language.features.resources.url */
					resources?: Activatable<{
						channelId: string;
					}>;

					roles?: Activatable<{
						channelId: string;
					}>;

					welcome?: Activatable<{
						channelId: string;
						ruleChannelId: string;
					}>;
				};
			}>;
		};
	}>;

	/** Language section of features. */
	language: Activatable<{
		features: {
			/** @since v3.3.0 */
			answers?: Activatable;

			/** @since v3.4.0 */
			corrections?: Activatable;

			/** @since v3.1.0 */
			cefr?: Activatable<CefrConfiguration>;

			game?: Activatable;

			resources?: Activatable<{
				url: string;
			}>;

			translate?: Activatable;

			word?: Activatable;

			/** @since v3.8.0 */
			targetOnly?: Activatable<{
				channelIds: string[];
			}>;

			/** @since v3.10.0 */
			roleLanguages?: Activatable<{
				ids: Record<string, LocalisationLanguage>;
			}>;
		};
	}>;

	/** Moderation section of features. */
	moderation: Activatable<{
		/** Features part of the moderation section. */
		features: {
			alerts?: Activatable<{
				channelId: string;
			}>;

			policy?: Activatable;

			rules?: Activatable;

			/** Message purging. */
			purging?: Activatable<{
				journaling: boolean;
			}>;

			/** @since v3.2.0 */
			slowmode?: Activatable<{
				journaling: boolean;
			}>;

			timeouts?: Activatable<{
				journaling: boolean;
			}>;

			/** Warning and pardoning users. */
			warns?: Activatable<{
				journaling: boolean;

				/**
				 * Length of time after which warnings expire.
				 *
				 * If not set, warnings will never expire.
				 */
				expiration?: TimeStruct;

				/** The maximum number of warnings a given user can receive before being timed out. */
				limit: number;

				/**
				 * Specifies auto-timeouts on limit being crossed.
				 *
				 * Implies `limit` being set to a specific value.
				 */
				autoTimeout?: Activatable<{
					duration?: TimeStruct;
				}>;
			}>;

			/** User reports. */
			reports?: Activatable<{
				channelId: string;
				journaling: boolean;
				rateLimit?: RateLimit;
				/** @since v3.28.0 */
				management?: {
					roles?: string[];
					users?: string[];
				};
			}>;

			/** User verification. */
			/** Relies on guild.features.server.tickets.categoryId */
			verification?: Activatable<{
				channelId: string;

				journaling: boolean;

				/** @since v3.35.0 */
				management?: {
					roles?: string[];
					users?: string[];
				};

				/** Users that can partake in accepting / rejecting verification answers. */
				voting: {
					roles: string[];
					users?: string[];
					verdict: {
						acceptance: VerificationVerdictRequirement;
						rejection: VerificationVerdictRequirement;
					};
				};

				activation: VerificationActivationRule[];
			}>;
		};
	}>;

	/** Server section of features. */
	server: Activatable<{
		features: {
			/** Automatic channel creation/deletion. */
			dynamicVoiceChannels?: Activatable<{
				channels: DynamicVoiceChannel[];
			}>;

			entry?: Activatable;

			/** @since v3.7.0 */
			roleIndicators?: Activatable<{
				limit: number;
				roles: RoleWithIndicator[];
			}>;

			/** User suggestions for the server. */
			suggestions?: Activatable<{
				channelId: string;
				journaling: boolean;
				rateLimit?: RateLimit;
				/** @since v3.28.0 */
				management?: {
					roles?: string[];
					users?: string[];
				};
			}>;

			/** @since v3.28.0 */
			resources?: Activatable<{
				channelId: string;
				journaling: boolean;
				rateLimit?: RateLimit;
				management?: {
					roles?: string[];
					users?: string[];
				};
			}>;

			/** @since v3.29.0 */
			tickets?: Activatable<{
				channelId: string;
				categoryId: string;
				journaling: boolean;
				rateLimit?: RateLimit;
				limit?: number;
				management?: {
					roles?: string[];
					users?: string[];
				};
			}>;
		};
	}>;

	/** Social section of features. */
	social: Activatable<{
		features: {
			music?: Activatable<{
				implicitVolume: number; // Increments of 5, 50 - 100.
			}>;

			praises?: Activatable<{
				journaling: boolean;
				rateLimit?: RateLimit;
			}>;

			profile?: Activatable;
		};
	}>;
}

type TimeStruct = [number: number, unit: TimeUnit];

function timeStructToMilliseconds([number, unit]: TimeStruct): number {
	const duration = constants.time[unit];
	return duration * number;
}

type Activatable<T extends Record<string, unknown> = Record<string, unknown>> = { enabled: boolean } & (
	| ({ enabled: false } & Partial<T>)
	| ({ enabled: true } & T)
);
type Enabled<T> = T & { enabled: true };

type RateLimit = {
	uses: number;
	within: TimeStruct;
};

type CefrLevelExamples = {
	a1: string;
	a2: string;
	b1: string;
	b2: string;
	c1: string;
	c2: string;
};
type CefrLevelExamplesExtended = CefrLevelExamples & {
	a0: string;
	c3: string;
};
type CefrConfiguration<Extended extends boolean = boolean> = {
	extended: Extended;
	examples?: Activatable<{
		levels: true extends Extended ? CefrLevelExamplesExtended : CefrLevelExamples;
	}>;
};

type DynamicVoiceChannel = {
	id: string;
	minimum?: number;
	maximum?: number;
};

type VerificationVerdictRequirementType = "fraction" | "number";
type VerificationVerdictRequirement = {
	type: VerificationVerdictRequirementType;
	value: unknown;
} & ({ type: "fraction"; value: number } | { type: "number"; value: number });

type VerificationActivationRuleType = "account-age";
type VerificationActivationRule = {
	type: VerificationActivationRuleType;
	value: unknown;
} & {
	type: "account-age";
	value: TimeStruct;
};

type RoleWithIndicator = { roleId: string; indicator: string };

/** @since v3.0.0 */
class Guild extends Model<{ idParts: ["guildId"] }> {
	get guildId(): string {
		return this.idParts[0];
	}

	readonly createdAt: number;
	readonly languages: GuildLanguages;
	readonly features: GuildFeatures;
	/**
	 * Whether the guild is native to Logos.
	 *
	 * Includes Learn Romanian and Learn Armenian.
	 */
	readonly isNative: boolean;

	get localisationLanguage(): LocalisationLanguage {
		return this.languages?.localisation ?? defaults.LOCALISATION_LANGUAGE;
	}

	get targetLanguage(): LocalisationLanguage {
		return this.languages?.target ?? this.localisationLanguage;
	}

	get featureLanguage(): FeatureLanguage {
		return this.languages?.feature ?? defaults.LOCALISATION_LANGUAGE;
	}

	get informationFeatures(): GuildFeatures["information"]["features"] | undefined {
		if (!this.features.information.enabled) {
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

	get languageFeatures(): GuildFeatures["language"]["features"] | undefined {
		if (!this.features.language.enabled) {
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

	get moderationFeatures(): GuildFeatures["moderation"]["features"] | undefined {
		if (!this.features.moderation.enabled) {
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

	get serverFeatures(): GuildFeatures["server"]["features"] | undefined {
		if (!this.features.server.enabled) {
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

	// TODO(vxern): Naming?
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

	get socialFeatures(): GuildFeatures["social"]["features"] | undefined {
		if (!this.features.social.enabled) {
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

	constructor({
		createdAt,
		languages,
		features,
		isNative,
		...data
	}: {
		createdAt?: number;
		languages?: GuildLanguages;
		features?: GuildFeatures;
		isNative?: boolean;
	} & MetadataOrIdentifierData<Guild>) {
		super({
			"@metadata": Model.buildMetadata(data, { collection: "Guilds" }),
		});

		this.createdAt = createdAt ?? Date.now();
		this.languages = languages ?? { localisation: "English/American", feature: "English" };
		this.features = features ?? {
			information: { enabled: false },
			moderation: { enabled: false },
			language: { enabled: false },
			server: { enabled: false },
			social: { enabled: false },
		};
		this.isNative = isNative ?? false;
	}

	static async get(client: Client, data: IdentifierData<Guild>): Promise<Guild | undefined> {
		const partialId = Model.buildPartialId(data);
		if (client.documents.guilds.has(partialId)) {
			return client.documents.guilds.get(partialId)!;
		}

		const { promise, resolve } = Promise.withResolvers<Guild>();

		await client.database.withSession(async (session) => {
			const guildDocument = await session.get<Guild>(Model.buildId(data, { collection: "Guilds" }));
			if (guildDocument === undefined) {
				return;
			}

			resolve(guildDocument);
		});

		return promise;
	}

	static async getOrCreate(client: Client, data: IdentifierData<Guild>): Promise<Guild> {
		const guildDocument = await Guild.get(client, data);
		if (guildDocument !== undefined) {
			return guildDocument;
		}

		const { promise, resolve } = Promise.withResolvers<Guild>();

		await client.database.withSession(async (session) => {
			const guildDocument = new Guild(data);

			await session.set(guildDocument);
			await session.saveChanges();

			resolve(guildDocument);
		});

		return promise;
	}

	isEnabled(feature: keyof Guild) {
		return this[feature] !== undefined;
	}

	areEnabled(feature: keyof Guild) {
		return this[feature] !== undefined;
	}

	isTargetLanguageOnly(channelId: string): boolean {
		return this.targetOnly?.channelIds?.includes(channelId) ?? false;
	}
}

export { timeStructToMilliseconds, Guild };
export type { DynamicVoiceChannel, TimeStruct, RoleWithIndicator, RateLimit };
