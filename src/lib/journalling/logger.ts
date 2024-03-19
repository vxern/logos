import { Client } from "../client";

// TODO(vxern): The loggers need to be localised.
abstract class EventLogger<Event extends keyof Events> {
	readonly client: Client;

	readonly title: string;
	readonly colour: number;

	constructor(client: Client, { title, colour }: { title: string; colour: number }) {
		this.client = client;

		this.title = title;
		this.colour = colour;
	}

	abstract filter(originGuildId: bigint, ...args: Events[Event]): boolean;

	abstract buildMessage(...args: Events[Event]): Promise<string | undefined> | string | undefined;
}

export { EventLogger };
