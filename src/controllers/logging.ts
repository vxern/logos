import { Channel, Guild, sendMessage } from '../../deps.ts';
import { Client } from '../client.ts';
import configuration from '../configuration.ts';
import { getTextChannel } from '../utils.ts';
import { Controller } from './controller.ts';
import generators, {
	Events,
	MessageGenerators,
} from '../commands/information/data/generators/generators.ts';
import { ClientEvents } from '../commands/information/data/generators/client.ts';

/** Stores the message generators for all handled events. */
const messageGenerators: MessageGenerators = {
	...generators.client,
	...generators.guild,
};

/** Controller responsible for logging client and guild events. */
class LoggingController extends Controller {
	/** The channel used for logging events. */
	private channel?: Channel;

	/** Constructs a {@link LoggingController}. */
	constructor(client: Client, guild: Guild) {
		super(client, guild);
		this.setupChannel(guild).then(() => this.startListening());
	}

	private async setupChannel(guild: Guild): Promise<void> {
		this.channel = await getTextChannel(
			guild,
			configuration.guilds.channels.logging,
		);

		if (!this.channel) {
			console.error(
				`Failed to set up log service for guild '${guild.name}': No journal channel found.`,
			);
			return;
		}
	}

	private startListening(): void {
		if (!this.channel) return;

		const eventNames = <(keyof ClientEvents)[]> Object.keys(generators.client);

		for (const eventName of eventNames) {
			const eventHandler = this.client.bot.events[eventName]!;
			this.client.bot.events[eventName]! = (
				...args: ClientEvents[keyof ClientEvents]
			) => {
				// @ts-ignore: Improve typing to prevent rest parameter/tuple error.
				eventHandler(...args);
				this.log(eventName, ...args);
			};
		}
	}

	/**
	 * Taking an event and an array of parameters required by the event, generates
	 * a message for that event and logs it.
	 *
	 * @param event - The event to log.
	 * @param args - The array of parameters required by the event.
	 */
	async log<K extends keyof Events>(
		event: K,
		...args: Events[K]
	): Promise<void> {
		if (!this.channel) return;

		const entry = messageGenerators[event];
		if (!entry) {
			return console.error(
				`Attempted to log event '${event}', however, this event is not handled.`,
			);
		}

		const filter = entry.filter(this.client, this.channel.guildId, ...args);
		if (!filter) return;

		const message = await entry.message(this.client, ...args);
		if (!message) return;

		return void sendMessage(this.client.bot, this.channel!.id, {
			embeds: [{
				title: entry.title,
				description: message,
				color: entry.color,
			}],
		});
	}
}

export { LoggingController };
