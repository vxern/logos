import { FeatureLanguage, LearningLanguage, LocalisationLanguage } from "../../constants/languages";
import time from "../../constants/time";
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
			journaling: Activatable<{
				/** The ID of the channel the events will be logged to. */
				channelId: string;
			}>;

			/** Informational notices. */
			notices: Activatable<{
				features: {
					information: Activatable<{
						channelId: string;
						inviteLink: string;
					}>;

					/** @since v3.28.0 */
					/** Relies on guild.features.language.features.resources.url */
					resources?: Activatable<{
						channelId: string;
					}>;

					roles: Activatable<{
						channelId: string;
					}>;

					welcome: Activatable<{
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

			game: Activatable;

			resources: Activatable<{
				url: string;
			}>;

			translate: Activatable;

			word: Activatable;

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
			alerts: Activatable<{
				channelId: string;
			}>;

			policy: Activatable;

			rules: Activatable;

			/** Message purging. */
			purging: Activatable<{
				journaling: boolean;
			}>;

			/** @since v3.2.0 */
			slowmode?: Activatable<{
				journaling: boolean;
			}>;

			timeouts: Activatable<{
				journaling: boolean;
			}>;

			/** Warning and pardoning users. */
			warns: Activatable<{
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
				autoTimeout: Activatable<{
					duration?: TimeStruct;
				}>;
			}>;

			/** User reports. */
			reports: Activatable<{
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
			verification: Activatable<{
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
			dynamicVoiceChannels: Activatable<{
				channels: DynamicVoiceChannel[];
			}>;

			entry: Activatable;

			/** @since v3.7.0 */
			roleIndicators?: Activatable<{
				limit: number;
				roles: RoleWithIndicator[];
			}>;

			/** User suggestions for the server. */
			suggestions: Activatable<{
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
			music: Activatable<{
				implicitVolume: number; // Increments of 5, 50 - 100.
			}>;

			praises: Activatable<{
				journaling: boolean;
				rateLimit?: RateLimit;
			}>;

			profile: Activatable;
		};
	}>;
}

type TimeUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";
type TimeStruct = [number: number, unit: TimeUnit];

const durationByTimeUnit = {
	second: time.second,
	minute: time.minute,
	hour: time.hour,
	day: time.day,
	week: time.week,
	month: time.month,
	year: time.year,
} satisfies Record<TimeUnit, number>;

function timeStructToMilliseconds([number, unit]: TimeStruct): number {
	const duration = durationByTimeUnit[unit];
	return duration * number;
}

type Activatable<T extends Record<string, unknown> = Record<string, unknown>> = { enabled: boolean } & (
	| ({ enabled: false } & Partial<T>)
	| ({ enabled: true } & T)
);

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
	examples: Activatable<{
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
		return this._idParts[0]!;
	}

	readonly languages: GuildLanguages;
	readonly features: GuildFeatures;
	/**
	 * Whether the guild is native to Logos.
	 *
	 * Includes Learn Romanian and Learn Armenian.
	 */
	readonly isNative: boolean;

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
			createdAt,
			"@metadata":
				"@metadata" in data ? data["@metadata"] : { "@collection": "Guilds", "@id": Model.buildPartialId<Guild>(data) },
		});

		// TODO(vxern): At some point, remove this when the object becomes nullable.
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

	static async getOrCreate(client: Client, data: IdentifierData<Guild>): Promise<Guild> {
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

		await client.database.withSession(async (session) => {
			const guildDocument = new Guild(data);

			await session.set(guildDocument);
			await session.saveChanges();

			resolve(guildDocument);
		});

		return promise;
	}
}

export { timeStructToMilliseconds, Guild };
export type { DynamicVoiceChannel, CefrConfiguration, TimeStruct, RoleWithIndicator };
