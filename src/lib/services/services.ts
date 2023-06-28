import { Bot } from "discordeno";
import entry from "./entry/entry.js";
import notices from "./notices/notices.js";
import prompts from "./prompts/prompts.js";
import dynamicVoiceChannels from "./dynamic-voice-channels.js";
import roles from "./roles.js";
import { Client } from "../client.js";

type ServiceStarter = ([client, bot]: [Client, Bot]) => void;

const services = [entry, dynamicVoiceChannels, notices, prompts, roles];

export default services;
export type { ServiceStarter };
