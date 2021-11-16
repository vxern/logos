import { Client } from "../client.ts";
import entry from "./entry.ts";

const services: ServiceStarter[] = [entry];

type ServiceStarter = (client: Client) => unknown;

export type { ServiceStarter };
export default services;
