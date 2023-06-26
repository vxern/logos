import { Bot, Channel, Guild, sendMessage } from 'discordeno';
import { ClientEvents } from 'logos/src/lib/controllers/logging/generators/client.ts';
import generators, { Events } from 'logos/src/lib/controllers/logging/generators/generators.ts';
import { Client, extendEventHandler } from 'logos/src/lib/client.ts';
import { getTextChannel } from 'logos/src/lib/utils.ts';
import configuration from 'logos/src/configuration.ts';

type ClientEventNames = keyof ClientEvents;
const clientEventNames = Object.keys(generators.client) as ClientEventNames[];

function setupLogging([client, bot]: [Client, Bot], guild: Guild): void {
	const logChannel = getTextChannel(guild, configuration.guilds.channels.logging);
	if (logChannel === undefined) return;

	for (const event of clientEventNames) {
		extendEventHandler(bot, event, { append: true }, (...args) => {
			logToChannel([client, bot], logChannel, event, ...args);
		});
	}
}

const messageGenerators = { ...generators.client, ...generators.guild };

function logEvent<K extends keyof Events>(
	[client, bot]: [Client, Bot],
	guild: Guild,
	event: K,
	args: Events[K],
): void {
	const logChannel = getTextChannel(guild, configuration.guilds.channels.logging);
	if (logChannel === undefined) return;

	return void logToChannel([client, bot], logChannel, event, ...args);
}

async function logToChannel<K extends keyof Events>(
	[client, bot]: [Client, Bot],
	channel: Channel,
	event: K,
	...args: Events[K]
): Promise<void> {
	const entry = messageGenerators[event];
	if (entry === undefined) return;

	const filter = entry.filter(client, channel.guildId, ...args);
	if (!filter) return;

	const message = await new Promise<string | undefined>((resolve) => {
		const result = entry.message(client, ...args);
		if (result === undefined) return resolve(undefined);

		if (typeof result === 'string') return resolve(result);

		return result.then((message) => resolve(message));
	});
	if (message === undefined) return;

	return void sendMessage(bot, channel.id, {
		embeds: [{
			title: entry.title,
			description: message,
			color: entry.color,
		}],
	})
		.catch(() => client.log.warn(`Failed to log '${event}' event on guild with ID ${channel.guildId}.`));
}

export { logEvent, setupLogging };
