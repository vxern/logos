import * as Discord from "@discordeno/bot";

declare module "@discordeno/bot" {
	type Locale = `${Discord.Locales}`;
	type VoiceServerUpdate = Parameters<Discord.EventHandlers["voiceServerUpdate"]>[0];
}
