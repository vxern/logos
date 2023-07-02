import { Language } from "../../../types";

type TimeUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";
type TimeStruct = [number: number, unit: TimeUnit];

type Activatable<T extends Record<string, unknown>> = { enabled: boolean } & (
	| ({ enabled: false } & Partial<T>)
	| ({ enabled: true } & T)
);

interface Guild {
	/** A timestamp of when Logos began to manage this guild. */
	createdAt: number;

	/** This guild's ID. */
	id: string;

	/**
	 * The bot's nickname on this guild.
	 *
	 * Must be between 2-32 characters long.
	 *
	 * If not set, the bot's nickname will be its username.
	 */
	nickname?: string;

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

				/** User suggestions for the server. */
				suggestions: Activatable<Record<string, unknown>>;
			};
		}>;

		/** Moderation section of features. */
		moderation: Activatable<{
			/** Features part of the moderation section. */
			features: {
				/** Message purging. */
				purging: Activatable<{
					journaling: Activatable<{
						channelId: string;
					}>;
				}>;

				/** Warning and pardoning users. */
				warns: Activatable<{
					journaling: Activatable<{
						channelId: string;
					}>;

					/**
					 * Length of time after which warnings expire.
					 *
					 * If not set, warnings will never expire.
					 */
					expiration?: TimeStruct;

					/** The maximum number of warnings a given user can receive before being timed out. */
					limit?: number;

					/**
					 * Specifies auto-timeouts on limit being crossed.
					 *
					 * Implies `limit` being set to a specific value.
					 */
					autoTimeout: Activatable<{
						duration: TimeStruct;
					}>;
				}>;

				/** User reports. */
				reports: Activatable<{
					journaling: Activatable<{
						channelId: string;
					}>;

					limit: {
						uses: number;
						within: TimeStruct;
					};
				}>;
			};
		}>;

		/** Music section of features. */
		music: Activatable<{
			features: {
				dynamicVoiceChannels: Activatable<{
					channelIds: string[];
				}>;
				music: Activatable<{
					implicitVolume: number; // Increments of 5, 50 - 100.
				}>;
			};
		}>;

		/** Social section of features. */
		social: Activatable<{
			features: {
				praises: Activatable<{
					limit: {
						uses: number;
						within: TimeStruct;
					};
				}>;
			};
		}>;
	};
}

export type { Guild };
