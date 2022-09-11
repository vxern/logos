import { Bot } from '../../deps.ts';
import { Client } from '../client.ts';
import entry from './entry.ts';

type ServiceStarter = ([client, bot]: [Client, Bot]) => void;

const services = [entry];

export default services;
export type { ServiceStarter };
