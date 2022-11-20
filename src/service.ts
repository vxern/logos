import { Bot } from 'discordeno';
import { dynamicVoiceChannels, entry } from './services/mod.ts';
import { Client } from './client.ts';

type ServiceStarter = ([client, bot]: [Client, Bot]) => void;

const services = [dynamicVoiceChannels, entry];

export default services;
export type { ServiceStarter };
