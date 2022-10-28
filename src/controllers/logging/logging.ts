import { Bot, Channel, Guild, sendMessage } from '../../../deps.ts';
import configuration from '../../configuration.ts';
import { getTextChannel } from '../../utils.ts';
import { Client } from '../../client.ts';
import generators, { Events } from './generators/generators.ts';
import { ClientEvents } from './generators/client.ts';

const clientEventNames = <(keyof ClientEvents)[]> Object.keys(
	generators.client,
);

function setupLogging([client, bot]: [Client, Bot], guild: Guild): void {
	const logChannel = getTextChannel(
		guild,
		configuration.guilds.channels.logging,
	);
	if (!logChannel) return;

	for (const eventName of clientEventNames) {
		const handleEvent = bot.events[eventName];
		bot.events[eventName] = (...args: Parameters<typeof handleEvent>) => {
			// @ts-ignore: Fix type error.
			handleEvent(...args);
			logToChannel([client, bot], logChannel, eventName, ...args);
		};
	}
}

const messageGenerators = { ...generators.client, ...generators.guild };

function log<K extends keyof Events>(
	[client, bot]: [Client, Bot],
	guild: Guild,
	event: K,
	...args: Events[K]
): void {
	const logChannel = getTextChannel(
		guild,
		configuration.guilds.channels.logging,
	);
	if (!logChannel) return;

	return logToChannel([client, bot], logChannel, event, ...args);
}

function logToChannel<K extends keyof Events>(
	[client, bot]: [Client, Bot],
	channel: Channel,
	event: K,
	...args: Events[K]
): void {
	const entry = messageGenerators[event];
	if (!entry) return;

	const filter = entry.filter(client, channel.guildId, ...args);
	if (!filter) return;

	const logMessage = (message: string) =>
		void sendMessage(bot, channel.id, {
			embeds: [{
				title: entry.title,
				description: message,
				color: entry.color,
			}],
		});

	const messageOrPromise = entry.message(client, ...args);
	if (messageOrPromise === undefined) return;

	if (typeof messageOrPromise === 'string') {
		return logMessage(messageOrPromise);
	}

	return void messageOrPromise.then((message) => logMessage(message));
}

export { log, setupLogging };
