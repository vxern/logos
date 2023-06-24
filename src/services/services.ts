import { Bot } from 'discordeno';
import entry from 'logos/src/services/entry/entry.ts';
import notices from 'logos/src/services/notices/notices.ts';
import prompts from 'logos/src/services/prompts/prompts.ts';
import dynamicVoiceChannels from 'logos/src/services/dynamic-voice-channels.ts';
import roles from 'logos/src/services/roles.ts';
import { Client } from 'logos/src/client.ts';

type ServiceStarter = ([client, bot]: [Client, Bot]) => void;

const services = [entry, dynamicVoiceChannels, notices, prompts, roles];

export default services;
export type { ServiceStarter };
