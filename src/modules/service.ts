import { Client } from '../client.ts';
import antiAbuse from './moderation/services/anti-abuse.ts';
import entry from './secret/services/entry.ts';

const services: ServiceStarter[] = [antiAbuse, entry];

type ServiceStarter = (client: Client) => unknown;

export type { ServiceStarter };
export default services;
