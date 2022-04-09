import { Collector, Guild, GuildTextChannel } from '../../../deps.ts';
import { Controller } from '../controller.ts';
import generators from './generators.ts';

class LoggingController extends Controller {
	channel?: GuildTextChannel;

	constructor(guild: Guild) {
		super(guild);
		this.setupChannel(guild).then(() => this.startListening(guild));
	}

	async setupChannel(guild: Guild): Promise<void> {
		const channels = await guild.channels.array();
		this.channel = channels.find((channel) =>
			channel.name.includes('journal')
		) as GuildTextChannel | undefined;
	}

	async startListening(guild: Guild): Promise<void> {
		if (!this.channel) {
			console.error(
				`Failed to set up log service for guild '${guild
					.name!}': No journal channel found.`,
			);
			return;
		}

		for (const [event, entry] of Object.entries(generators)) {
			const collector = new Collector({
				event: event,
				client: guild.client,
				filter: (...args) =>
					(entry.filter as (...args: any[]) => boolean)(guild, ...args),
			});

			collector.on('collect', (...args) => {
				const message = (entry.message as (...args: any[]) => string)(...args);
				if (!message) return;

				this.channel!.send({
					embed: {
						title: entry.title,
						description: message,
						color: entry.color,
					},
				});
			});

			collector.collect();
		}
	}
}

export { LoggingController };
