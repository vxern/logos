import { Bot, Channel, ChannelTypes, Collection, createChannel, deleteChannel, Guild, VoiceState } from 'discordeno';
import { Client } from 'logos/src/client.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';
import configuration from 'logos/configuration.ts';

const previousVoiceStateByUserId = new Map<bigint, VoiceState>();

const service: ServiceStarter = ([client, bot]) => {
	const voiceStateUpdate = bot.events.voiceStateUpdate;

	bot.events.voiceStateUpdate = (bot, voiceState) => {
		voiceStateUpdate(bot, voiceState);
		onVoiceStateUpdate(client, bot, voiceState);
	};
};

function onVoiceStateUpdate(
	client: Client,
	bot: Bot,
	voiceState: VoiceState,
): void {
	const guild = client.cache.guilds.get(voiceState.guildId);
	if (guild === undefined) return;

	const voiceChannelStatesTuples = getVoiceChannelStatesTuples(guild);
	if (voiceChannelStatesTuples.length === 0) return;

	const previousState = previousVoiceStateByUserId.get(voiceState.userId);
	const currentState = voiceState;

	if (previousState?.channelId === undefined) {
		onConnect(bot, guild, voiceChannelStatesTuples, currentState);
	} else if (previousState.channelId !== undefined && currentState.channelId === undefined) {
		onDisconnect(bot, voiceChannelStatesTuples, previousState);
	} else {
		onDisconnect(bot, voiceChannelStatesTuples, previousState);
		onConnect(bot, guild, voiceChannelStatesTuples, currentState);
	}

	previousVoiceStateByUserId.set(currentState.userId, voiceState);
}

type VoiceChannelStatesTuple = [Channel, VoiceState[]];

function onConnect(
	bot: Bot,
	guild: Guild,
	voiceChannelStatesTuples: VoiceChannelStatesTuple[],
	currentState: VoiceState,
): void {
	const [_channel, states] = voiceChannelStatesTuples.find(([channel, _states]) =>
		channel.id === currentState.channelId!
	)!;
	// If somebody is already connected to the channel, do not process.
	if (states.length !== 1) return;

	const freeChannels = voiceChannelStatesTuples.filter(([_channel, states]) => states.length === 0).length;
	// If there is a free channel available already, do not process.
	if (freeChannels !== 0) return;

	// If the channel limit has already been reached, do not process.
	if (voiceChannelStatesTuples.length >= configuration.services.dynamicVoiceChannels.limit) return;

	const anchor = voiceChannelStatesTuples.at(0)![0];

	return void createChannel(bot, guild.id, {
		name: configuration.guilds.channels.voiceChat,
		type: ChannelTypes.GuildVoice,
		parentId: anchor.parentId,
		position: voiceChannelStatesTuples.at(voiceChannelStatesTuples.length - 1)![0].position,
	});
}

function onDisconnect(
	bot: Bot,
	voiceChannelStatesTuples: VoiceChannelStatesTuple[],
	previousState: VoiceState,
): void {
	const [_channel, states] = voiceChannelStatesTuples.find(([channel, _states]) =>
		channel.id === previousState.channelId!
	)!;
	// If somebody is still connected to the channel, do not process.
	if (states.length !== 0) return;

	const freeChannels = voiceChannelStatesTuples.filter(([_channel, states]) => states.length === 0).length;
	// If there is up to one free channel already, do not process.
	if (freeChannels <= 1) return;

	return void deleteChannel(bot, previousState.channelId!);
}

function getVoiceChannelStatesTuples(guild: Guild): VoiceChannelStatesTuple[] {
	const voiceChannels = getRelevantVoiceChannels(guild);
	if (voiceChannels.length === 0) return [];

	const voiceStates = getRelevantVoiceStates(guild, [
		...voiceChannels.map((channel) => channel.id),
	]);

	return voiceChannels.map<[Channel, VoiceState[]]>((
		channel,
	) => [channel, voiceStates.get(channel.id)!]);
}

function getRelevantVoiceChannels(guild: Guild): Channel[] {
	const channels = guild.channels
		.filter(
			(channel) =>
				channel.type === ChannelTypes.GuildVoice && channel.name! === configuration.guilds.channels.voiceChat,
		).array().toSorted((a, b) => a.position === b.position ? Number(a.id - b.id) : a.position! - b.position!);

	return channels;
}

function getRelevantVoiceStates(
	guild: Guild,
	channelIds: bigint[],
): Collection<bigint, VoiceState[]> {
	const voiceStates = guild.voiceStates.array().filter((voiceState) => voiceState.channelId !== undefined);
	return new Collection(
		channelIds.map((channelId) => [
			channelId,
			voiceStates.filter((voiceState) => voiceState.channelId! === channelId),
		]),
	);
}

export default service;
