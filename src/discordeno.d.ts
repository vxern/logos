import * as Discord from "discordeno";

declare module "discordeno" {
	type VoiceServerUpdate = Parameters<Discord.EventHandlers["voiceServerUpdate"]>[1];
}
