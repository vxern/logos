import type { FeatureLanguage } from "logos:constants/languages/feature";
import type { LearningLanguage } from "logos:constants/languages/learning";
import type { LocalisationLanguage } from "logos:constants/languages/localisation";
import type { TimeStruct } from "logos:constants/time";

interface GuildDocument {
	createdAt: number;
	isNative: boolean;
	languages: {
		localisation: LocalisationLanguage;
		target: LearningLanguage;
		feature: FeatureLanguage;
	};
	enabledFeatures: {
		journalling: boolean;
		notices: boolean;
		informationNotices: boolean;
		resourceNotices: boolean;
		roleNotices: boolean;
		welcomeNotices: boolean;
		answers: boolean;
		corrections: boolean;
		cefr: boolean;
		game: boolean;
		resources: boolean;
		translate: boolean;
		word: boolean;
		wordSigils: boolean;
		context: boolean;
		targetOnly: boolean;
		roleLanguages: boolean;
		alerts: boolean;
		policy: boolean;
		rules: boolean;
		purging: boolean;
		slowmode: boolean;
		timeouts: boolean;
		warns: boolean;
		reports: boolean;
		antiFlood: boolean;
		verification: boolean;
		dynamicVoiceChannels: boolean;
		entry: boolean;
		roleIndicators: boolean;
		suggestions: boolean;
		resourceSubmissions: boolean;
		tickets: boolean;
		music: boolean;
		praises: boolean;
		profile: boolean;
	};
	journalling: {
		purging: boolean;
		slowmode: boolean;
		timeouts: boolean;
		warns: boolean;
		reports: boolean;
		antiFlood: boolean;
		verification: boolean;
		suggestions: boolean;
		resourceSubmissions: boolean;
		tickets: boolean;
		praises: boolean;
	};
	rateLimits: {
		reports?: RateLimit;
		suggestions?: RateLimit;
		resourceSubmissions?: RateLimit;
		tickets?: RateLimit;
		praises?: RateLimit;
	};
	management: {
		reports?: FeatureManagement;
		verification?: FeatureManagement;
		suggestions?: FeatureManagement;
		resourceSubmissions?: FeatureManagement;
		tickets?: FeatureManagement;
	};
	features: {
		journalling?: {
			channelId: string;
		};
		informationNotices?: {
			channelId: string;
			inviteLink: string;
		};
		/** Relies on guild.features.language.features.resources.url */
		resourceNotices?: {
			channelId: string;
		};
		roleNotices?: {
			channelId: string;
		};
		welcomeNotices?: {
			channelId: string;
			ruleChannelId: string;
		};
		cefr?: {
			examples?: {
				a1: string;
				a2: string;
				b1: string;
				b2: string;
				c1: string;
				c2: string;
			};
		};
		resources?: {
			url: string;
		};
		targetOnly?: {
			channelIds: string[];
		};
		roleLanguages?: {
			ids: Record<string, LocalisationLanguage>;
		};
		alerts?: {
			channelId: string;
		};
		warns?: {
			expiration?: TimeStruct;
			limit: number;
			autoTimeout?: {
				duration: TimeStruct;
			};
		};
		reports?: {
			channelId: string;
		};
		antiFlood?: {
			interval?: TimeStruct;
			messageCount?: number;
			timeoutDuration?: TimeStruct;
		};
		/** Relies on guild.features.server.tickets.categoryId */
		verification?: {
			channelId: string;
			voting: {
				roles: string[];
				users?: string[];
				verdict: {
					acceptance: { type: "fraction" | "number"; value: number };
					rejection: { type: "fraction" | "number"; value: number };
				};
			};
			activation: {
				type: "account-age";
				value: TimeStruct;
			}[];
		};
		dynamicVoiceChannels?: {
			channels: DynamicVoiceChannel[];
		};
		roleIndicators?: {
			limit: number;
			roles: RoleWithIndicator[];
		};
		suggestions?: {
			channelId: string;
		};
		resourceSubmissions?: {
			channelId: string;
		};
		tickets?: {
			channelId: string;
			categoryId: string;
			limit?: number;
		};
		music?: {
			implicitVolume: number;
		};
	};
}

interface RateLimit {
	uses: number;
	within: TimeStruct;
}

interface FeatureManagement {
	roles?: string[];
	users?: string[];
}

interface DynamicVoiceChannel {
	id: string;
	minimum?: number;
	maximum?: number;
}

interface RoleWithIndicator {
	roleId: string;
	indicator: string;
}

export type { GuildDocument, DynamicVoiceChannel, RoleWithIndicator, RateLimit, FeatureManagement };
