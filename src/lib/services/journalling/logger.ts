import { Client } from "../../client";

type Events = Logos.Events & Discord.Events;

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

	abstract message(...args: Events[Event]): Promise<string | undefined> | string | undefined;
}

export { EventLogger, Events };
