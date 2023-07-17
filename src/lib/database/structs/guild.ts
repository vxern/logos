import { Periods } from "../../../constants";
import { Language } from "../../../types";

interface Guild {
	/** A timestamp of when Logos began to manage this guild. */
	createdAt: number;

	/** This guild's ID. */
	id: string;

	/**
	 * Whether the guild is native to Logos.
	 *
	 * Includes Learn Romanian and Learn Armenian.
	 */
	isNative: boolean;

	/**
	 * The bot's default language on this guild.
	 *
	 * The implicit value is 'English'.
	 */
	language: Language;

	/** The bot's features configured for this guild. */
	features: {
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

		language: Activatable<{
			features: {
				game: Activatable;

				resources: Activatable<{
					url: string;
				}>;

				translate: Activatable;

				word: Activatable;
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
				}>;

				/** User verification. */
				verification: Activatable<{
					channelId: string;

					journaling: boolean;

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

				/** User suggestions for the server. */
				suggestions: Activatable<{
					channelId: string;
					journaling: boolean;
					rateLimit?: RateLimit;
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
	};
}

type TimeUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";
type TimeStruct = [number: number, unit: TimeUnit];

const durationByTimeUnit = {
	second: Periods.second,
	minute: Periods.minute,
	hour: Periods.hour,
	day: Periods.day,
	week: Periods.week,
	month: Periods.month,
	year: Periods.year,
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
type VerificationActivationRule =
	| {
			type: VerificationActivationRuleType;
			value: unknown;
	  } & {
			type: "account-age";
			value: TimeStruct;
	  };

export { timeStructToMilliseconds };
export type { Guild, DynamicVoiceChannel, TimeStruct };
