import { Client } from "../client.js";
import dynamicVoiceChannels from "./dynamic-voice-channels/dynamic-voice-channels.js";
import entry from "./entry/entry.js";
import notices from "./notices/notices.js";
import prompts from "./prompts/prompts.js";
import roles from "./roles/roles.js";
import * as Discord from "discordeno";

type ServiceStarter = ([client, bot]: [Client, Discord.Bot]) => void;

const services = [entry, dynamicVoiceChannels, notices, prompts, roles];

export default services;
export type { ServiceStarter };
