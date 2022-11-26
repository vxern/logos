import { Bot } from 'discordeno';
import dynamicVoiceChannels from 'logos/src/services/dynamic-voice-channels/dynamic-voice-channels.ts';
import entry from 'logos/src/services/entry/entry.ts';
import { Client } from 'logos/src/client.ts';

type ServiceStarter = ([client, bot]: [Client, Bot]) => void;

const services = [dynamicVoiceChannels, entry];

export default services;
export type { ServiceStarter };
