import { Bot } from '../../deps.ts';
import { Client } from '../client.ts';
import dynamicVoiceChannels from './dynamic-voice-channels/dynamic-voice-channels.ts';
import entry from './entry/entry.ts';

type ServiceStarter = ([client, bot]: [Client, Bot]) => void;

const services = [dynamicVoiceChannels, entry];

export default services;
export type { ServiceStarter };
