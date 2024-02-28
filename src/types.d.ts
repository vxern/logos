import * as Discord from "@discordeno/bot";
import { Properties } from "./constants/properties";
import { FeatureLanguage, LearningLanguage, Locale, LocalisationLanguage } from "./constants/languages";

declare global {
	interface PromiseConstructor {
		withResolvers<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: () => void };
	}

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

		// TODO(vxern): Should this be in the desired properties?
		type VoiceState = Pick<Discord.VoiceState, "guildId" | "channelId" | "userId">;

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
	}
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
}
