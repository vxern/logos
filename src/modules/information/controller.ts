import {
	ClientEvents,
	Collector,
	Guild,
	GuildTextChannel,
} from '../../../deps.ts';
import configuration from '../../configuration.ts';
import { getChannel } from '../../utils.ts';
import { Controller } from '../controller.ts';
import { MessageGenerators } from './data/generators/generator.ts';
import generators from './data/generators/generators.ts';
import { Events } from './data/log-entry.ts';

/** Controller responsible for logging client and guild events. */
class LoggingController extends Controller {
	/** Contains message generators for all handled events. */
	private readonly messageGenerators: MessageGenerators<Events> = {
		...generators.client,
		...generators.guild,
	};

	/** The channel used for logging events. */
	private channel!: GuildTextChannel;

	/** Constructs a {@link LoggingController}. */
	constructor(guild: Guild) {
		super(guild);
		this.setupChannel(guild).then(() => this.startListening(guild));
	}

	private async setupChannel(guild: Guild): Promise<void> {
		this.channel = await getChannel(
			guild,
			configuration.guilds.channels.logging,
		);
	}

	private startListening(guild: Guild): void {
		if (!this.channel) {
			console.error(
				`Failed to set up log service for guild '${guild
					.name!}': No journal channel found.`,
			);
			return;
		}

		for (const event of Object.keys(generators.client)) {
			const collector = new Collector({
				event: event,
				client: guild.client,
			});

			collector.on(
				'collect',
				(...args) => this.log(event as keyof ClientEvents, ...args),
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
	async log<T extends keyof Events>(
		event: T,
		...args: Events[T]
	): Promise<void> {
		const entry = this.messageGenerators[event];

		if (!entry) {
			return console.error(
				`Attempted to log event '${event}', however, this event is not handled.`,
			);
		}

		// TODO: Use other type than 'any'.

		const filter = (entry.filter as (...args: any[]) => boolean)(
			this.channel.guild,
			...args,
		);

		if (!filter) return;

		const message = await (entry.message as (
			...args: any[]
		) => Promise<string> | string | undefined)(...args);
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
