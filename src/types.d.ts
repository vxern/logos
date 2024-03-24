import constants_ from "logos:constants/constants";
import { FeatureLanguage, LearningLanguage, Locale, LocalisationLanguage } from "logos:constants/languages";
import { Properties } from "logos:constants/properties";
import { SlowmodeLevel } from "logos:constants/slowmode";
import * as Discord from "@discordeno/bot";
import { EntryRequest } from "logos/database/entry-request";
import { Praise } from "logos/database/praise";
import { Report } from "logos/database/report";
import { Resource } from "logos/database/resource";
import { Suggestion } from "logos/database/suggestion";
import { Ticket } from "logos/database/ticket";
import { Warning } from "logos/database/warning";

declare global {
	interface PromiseConstructor {
		createRace<T, R>(
			elements: T[],
			doAction: (element: T) => Promise<R | undefined>,
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

	type WithRequired<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> & Required<Pick<T, K>>;
}

declare global {
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
			locale: Locale;
			language: LocalisationLanguage;
			learningLanguage: LearningLanguage;
			featureLanguage: FeatureLanguage;
			guildLocale: Locale;
			guildLanguage: LocalisationLanguage;
		}

		type InteractionParameters<Parameters> = Parameters & { show: boolean; focused?: keyof Parameters };

		type Interaction<
			Metadata extends string[] = any,
			Parameters extends Record<string, string | number | boolean | undefined> = any,
		> = Omit<RawInteraction, "locale" | "guildLocale"> &
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

			/** An inquiry has been opened. */
			inquiryOpen: [member: Logos.Member, ticket: Ticket];

			/** A purging of messages has been initiated. */
			purgeBegin: [member: Logos.Member, channel: Logos.Channel, messageCount: number, author?: Logos.User];

			/** A purging of messages is complete. */
			purgeEnd: [member: Logos.Member, channel: Logos.Channel, messageCount: number, author?: Logos.User];

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

	type Events = Logos.Events & Discord.Events;
}

declare global {
	// @ts-ignore: This is fine.
	export * as Discord from "@discordeno/bot";
}

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

declare module "@discordeno/bot" {
	type Locale = `${Discord.Locales}`;
	type VoiceServerUpdate = Parameters<Discord.EventHandlers["voiceServerUpdate"]>[0];
	type DesiredProperties = DeepPartial<Discord.Transformers["desiredProperties"]>;

	type Events = {
		[T in keyof Discord.EventHandlers]: Parameters<Discord.EventHandlers[T]>;
	};
}
