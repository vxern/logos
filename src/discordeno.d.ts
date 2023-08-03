import * as Discord from "discordeno";

declare module "discordeno" {
	type Locale = `${Discord.Locales}`;
	type VoiceServerUpdate = Parameters<Discord.EventHandlers["voiceServerUpdate"]>[1];
}
