import * as Discord from "@discordeno/bot";

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

declare module "@discordeno/bot" {
	type Locale = `${Discord.Locales}`;
	type VoiceServerUpdate = Parameters<Discord.EventHandlers["voiceServerUpdate"]>[0];
	type DesiredProperties = DeepPartial<Discord.Transformers["desiredProperties"]>;
}
