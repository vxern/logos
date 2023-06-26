import { Bot } from 'discordeno';
import entry from 'logos/src/lib/services/entry/entry.ts';
import notices from 'logos/src/lib/services/notices/notices.ts';
import prompts from 'logos/src/lib/services/prompts/prompts.ts';
import dynamicVoiceChannels from 'logos/src/lib/services/dynamic-voice-channels.ts';
import roles from 'logos/src/lib/services/roles.ts';
import { Client } from 'logos/src/lib/client.ts';

type ServiceStarter = ([client, bot]: [Client, Bot]) => void;

const services = [entry, dynamicVoiceChannels, notices, prompts, roles];

export default services;
export type { ServiceStarter };
