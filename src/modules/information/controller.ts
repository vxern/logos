import {
	ClientEvents,
	Collector,
	Guild,
	GuildTextChannel,
} from '../../../deps.ts';
import configuration from '../../configuration.ts';
import { getTextChannel } from '../../utils.ts';
import { Controller } from '../controller.ts';
import { MessageGenerators } from './data/generators/generators.ts';
import generators from './data/generators/generators.ts';
import { Events } from './data/log-entry.ts';

/** Stores the message generators for all handled events. */
const messageGenerators: MessageGenerators<Events> = {
	...generators.client,
	...generators.guild,
};

/** Controller responsible for logging client and guild events. */
class LoggingController extends Controller {
	/** The channel used for logging events. */
	private channel?: GuildTextChannel;

	/** Constructs a {@link LoggingController}. */
	constructor(guild: Guild) {
		super(guild);
		this.setupChannel(guild).then(() => this.startListening());
	}

	private async setupChannel(guild: Guild): Promise<void> {
		this.channel = await getTextChannel(
			guild,
			configuration.guilds.channels.logging,
		);

		if (!this.channel) {
			console.error(
				`Failed to set up log service for guild '${guild
					.name!}': No journal channel found.`,
			);
			return;
		}
	}

	private startListening(): void {
		if (!this.channel) {
			return;
		}

		for (const event of Object.keys(generators.client)) {
			const collector = new Collector({
				event: event,
				client: this.guild.client,
			});

			collector.on(
				'collect',
				(...args) =>
					this.log(
						<keyof ClientEvents> event,
						...(<ClientEvents[keyof ClientEvents]> args),
					),
			);

			collector.collect();
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

		const filter = entry.filter(this.channel.guild, ...args);
		if (!filter) return;

		const message = await entry.message(...args);
		if (!message) return;

		this.channel!.send({
			embed: {
				title: entry.title,
				description: message,
				color: entry.color,
			},
		});
	}
}

export { LoggingController };
