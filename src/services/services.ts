import { Bot } from 'discordeno';
import dynamicVoiceChannels from 'logos/src/services/dynamic-voice-channels.ts';
import entry from 'logos/src/services/entry.ts';
import notices from 'logos/src/services/notices.ts';
import verification from 'logos/src/services/verification.ts';
import { Client } from 'logos/src/client.ts';

type ServiceStarter = ([client, bot]: [Client, Bot]) => void;

const services = [dynamicVoiceChannels, entry, notices, verification];

export default services;
export type { ServiceStarter };
