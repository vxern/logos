import { Client } from "logos/client";

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

	// TODO(vxern): Filtering could be done directly in the `JournallingStore`,
	//  and building the message could be just a simple handler.
	abstract filter(originGuildId: bigint, ...args: Events[Event]): boolean;

	abstract buildMessage(...args: Events[Event]): Promise<string | undefined> | string | undefined;
}

export { EventLogger };
