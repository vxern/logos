import { Bot } from 'discordeno';
import { dynamicVoiceChannels, entry } from 'logos/src/services/mod.ts';
import { Client } from 'logos/src/mod.ts';

type ServiceStarter = ([client, bot]: [Client, Bot]) => void;

const services = [dynamicVoiceChannels, entry];

export default services;
export type { ServiceStarter };
