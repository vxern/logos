import { Bot } from 'discordeno';
import prompts from 'logos/src/services/prompts/prompts.ts';
import dynamicVoiceChannels from 'logos/src/services/dynamic-voice-channels.ts';
import entry from 'logos/src/services/entry.ts';
import notices from 'logos/src/services/notices.ts';
import reports from 'logos/src/services/reports.ts';
import roles from 'logos/src/services/roles.ts';
import verification from 'logos/src/services/verification.ts';
import { Client } from 'logos/src/client.ts';

type ServiceStarter = ([client, bot]: [Client, Bot]) => void;

const services = [entry, dynamicVoiceChannels, notices, prompts, reports, roles, verification];

export default services;
export type { ServiceStarter };
