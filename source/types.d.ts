import type constants_ from "logos:constants/constants";
import type { FeatureLanguage, LearningLanguage, Locale, LocalisationLanguage } from "logos:constants/languages";
import type { Properties } from "logos:constants/properties";
import type { SlowmodeLevel } from "logos:constants/slowmode";
import type { WithRequired } from "logos:core/utilities.ts";
import type * as Discord from "@discordeno/bot";
import type { EntryRequest } from "logos/models/entry-request";
import type { Praise } from "logos/models/praise";
import type { Report } from "logos/models/report";
import type { Resource } from "logos/models/resource";
import type { Suggestion } from "logos/models/suggestion";
import type { Ticket } from "logos/models/ticket";
import type { Warning } from "logos/models/warning";

declare global {
	interface PromiseConstructor {
		createRace<T, R>(
			elements: T[],
			doAction: (element: T) => R | Promise<R | undefined> | undefined,
		): AsyncGenerator<{ element: T; result?: R }, void, void>;
	}

	interface Array<T> {
		/**
		 * Taking an array, splits it into parts of equal sizes.
		 *
		 * @param size - The size of each chunk.
		 * @returns The chunked array.
		 */
		toChunked(size: number): T[][];
	}

	interface ObjectConstructor {
		mirror<O extends Record<string, string>>(
			object: O,
		): {
			[K in keyof O as O[K]]: K;
		};
	}
}

declare global {
	// biome-ignore lint/style/noNamespace: We use Logos types to make a distinction from Discordeno types.
	namespace Logos {
		type Guild = Pick<
			Omit<Discord.Guild, "roles" | "members" | "channels" | "voiceStates"> & {
				roles: Discord.Collection<bigint, Role>;
				members: Discord.Collection<bigint, Member>;
				channels: Discord.Collection<bigint, Channel>;
				voiceStates: Discord.Collection<bigint, VoiceState>;
			},
			keyof Properties["guild"]
		>;

		type RawInteraction = Pick<Discord.Interaction, keyof Properties["interaction"]>;

		type Channel = Pick<Discord.Channel, keyof Properties["channel"]>;

		type User = Pick<Discord.User, keyof Properties["user"]>;

		type Member = Pick<Discord.Member, keyof Properties["member"]> & { user?: User };

		type Message = Pick<Discord.Message, keyof Properties["message"]>;

		type Role = Pick<Discord.Role, keyof Properties["role"]>;

		type VoiceState = Pick<Discord.VoiceState, keyof Properties["voiceState"]>;

		interface InteractionLocaleData {
			// Localisation
			locale: Locale;
			language: LocalisationLanguage;
			guildLocale: Locale;
			guildLanguage: LocalisationLanguage;
			displayLocale: Locale;
			displayLanguage: LocalisationLanguage;
			// Learning
			learningLocale: Locale;
			learningLanguage: LearningLanguage;
			// Feature
			featureLanguage: FeatureLanguage;
		}

		type InteractionParameters<Parameters> = Parameters & {
			"@repeat": boolean;
			show: boolean;
			focused?: keyof Parameters;
		};

		type Interaction<
			Metadata extends string[] = any,
			Parameters extends Record<string, string | number | boolean | undefined> = any,
		> = WithRequired<Omit<RawInteraction, "locale" | "guildLocale">, "guildId" | "channelId"> &
			InteractionLocaleData & {
				commandName: string;
				metadata: [customId: string, ...data: Metadata];
				parameters: InteractionParameters<Parameters>;
			};

		/** Type representing events that occur within a guild. */
		type Events = {
			/** An entry request has been submitted. */
			entryRequestSubmit: [user: Logos.User, entryRequest: EntryRequest];

			/** An entry request has been accepted. */
			entryRequestAccept: [user: Logos.User, by: Logos.Member];

			/** An entry request has been rejected. */
			entryRequestReject: [user: Logos.User, by: Logos.Member];

			/** A member has been warned. */
			memberWarnAdd: [member: Logos.Member, warning: Warning, by: Logos.User];

			/** A member has had a warning removed from their account. */
			memberWarnRemove: [member: Logos.Member, warning: Warning, by: Logos.User];

			/** A member has been timed out. */
			memberTimeoutAdd: [member: Logos.Member, until: number, reason: string, by: Logos.User];

			/** A member's timeout has been cleared. */
			memberTimeoutRemove: [member: Logos.Member, by: Logos.User];

			/** A member has been praised. */
			praiseAdd: [member: Logos.Member, praise: Praise, by: Logos.User];

			/** A report has been submitted. */
			reportSubmit: [author: Logos.Member, report: Report];

			/** A resource has been submitted. */
			resourceSend: [member: Logos.Member, resource: Resource];

			/** A suggestion has been made. */
			suggestionSend: [member: Logos.Member, suggestion: Suggestion];

			/** A ticket has been opened. */
			ticketOpen: [member: Logos.Member, ticket: Ticket];

			/** A ticket has been closed. */
			ticketClose: [member: Logos.Member, ticket: Ticket, by: Logos.User, messageLog: string];

			/** An inquiry has been opened. */
			inquiryOpen: [member: Logos.Member, ticket: Ticket];

			/** A purging of messages has been initiated. */
			purgeBegin: [member: Logos.Member, channel: Logos.Channel, messageCount: number, author?: Logos.User];

			/** A purging of messages is complete. */
			purgeEnd: [
				member: Logos.Member,
				channel: Logos.Channel,
				messageCount: number,
				messageLog: string,
				author?: Logos.User,
			];

			/** A user has enabled slowmode in a channel. */
			slowmodeEnable: [user: Logos.User, channel: Logos.Channel, level: SlowmodeLevel];

			/** A user has disabled slowmode in a channel. */
			slowmodeDisable: [user: Logos.User, channel: Logos.Channel];

			/** A user has upgraded the slowmode level in a channel. */
			slowmodeUpgrade: [
				user: Logos.User,
				channel: Logos.Channel,
				previousLevel: SlowmodeLevel,
				currentLevel: SlowmodeLevel,
			];

			/** A user has downgraded the slowmode level in a channel. */
			slowmodeDowngrade: [
				user: Logos.User,
				channel: Logos.Channel,
				previousLevel: SlowmodeLevel,
				currentLevel: SlowmodeLevel,
			];
		};
	}

	const constants: typeof constants_;
}

declare global {
	// biome-ignore lint/performance/noReExportAll: This is fine because we need these types under the `Discord` namespace.
	export * as Discord from "@discordeno/bot";
}

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

declare module "@discordeno/bot" {
	type Locale = `${Discord.Locales}`;
	type VoiceServerUpdate = Parameters<Discord.EventHandlers["voiceServerUpdate"]>[0];
	type DesiredProperties = DeepPartial<Discord.Transformers["desiredProperties"]>;
	type DeletedMessage = Discord.Events["messageDelete"][0];

	type Events = {
		[T in keyof Discord.EventHandlers]: Parameters<Discord.EventHandlers[T]>;
	};

	interface Message {
		// REMINDER(vxern): Monkey-patch for Discordeno messages.
		content?: string;
	}
}
