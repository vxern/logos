import { Client } from '../client.ts';
import entry from './entry.ts';

type ServiceStarter = (client: Client) => void;

const services = [entry];

export default services;
export type { ServiceStarter };
