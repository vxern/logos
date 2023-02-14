import { Bot, Channel, ChannelTypes, Collection, createChannel, deleteChannel, Guild, VoiceState } from 'discordeno';
import { ServiceStarter } from 'logos/src/services/services.ts';
import { Client, extendEventHandler } from 'logos/src/client.ts';
import { isVoice } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';

const previousVoiceStates = new Map<`${/*userId:*/ bigint}${/*guildId:*/ bigint}`, VoiceState>();

const service: ServiceStarter = ([client, bot]) => {
	extendEventHandler(bot, 'voiceStateUpdate', { append: true }, (_, voiceState) => {
		onVoiceStateUpdate([client, bot], voiceState);
	});

	extendEventHandler(bot, 'guildCreate', { append: true }, (_, { id: guildId }) => {
		const guild = client.cache.guilds.get(guildId);
		if (guild === undefined) return;

		const voiceChannelStatesTuples = getVoiceChannelStatesTuples(guild);
		if (voiceChannelStatesTuples.length === 0) return;

		for (const [_, voiceStates] of voiceChannelStatesTuples) {
			for (const voiceState of voiceStates) {
				onVoiceStateUpdate([client, bot], voiceState);
			}
		}

		const freeChannels = voiceChannelStatesTuples.filter(([_, states]) => states.length === 0)
			.map(([channel]) => channel);
		// If there is up to one free channel already, do not process.
		if (freeChannels.length <= 1) return;

		const freeChannelIds = freeChannels.map((channel) => channel.id);

		freeChannelIds.splice(0, 1);

		for (const channelId of freeChannelIds) {
			deleteChannel(bot, channelId);
		}
	});
};

function onVoiceStateUpdate([client, bot]: [Client, Bot], voiceState: VoiceState): void {
	const guild = client.cache.guilds.get(voiceState.guildId);
	if (guild === undefined) return;

	const voiceChannelStatesTuples = getVoiceChannelStatesTuples(guild);
	if (voiceChannelStatesTuples.length === 0) return;

	const previousState = previousVoiceStates.get(`${voiceState.userId}${voiceState.guildId}`);

	if (previousState?.channelId === undefined) {
		onConnect(bot, guild, voiceChannelStatesTuples, voiceState);
	} else if (previousState.channelId !== undefined && voiceState.channelId === undefined) {
		onDisconnect(bot, voiceChannelStatesTuples, previousState);
	} else {
		onDisconnect(bot, voiceChannelStatesTuples, previousState);
		onConnect(bot, guild, voiceChannelStatesTuples, voiceState);
	}

	previousVoiceStates.set(`${voiceState.userId}${voiceState.guildId}`, voiceState);
}

type VoiceChannelStatesTuple = [channel: Channel, voiceStates: VoiceState[]];

function onConnect(
	bot: Bot,
	guild: Guild,
	voiceChannelStatesTuples: VoiceChannelStatesTuple[],
	currentState: VoiceState,
): void {
	const tuple = voiceChannelStatesTuples.find(([channel, _states]) => channel.id === currentState.channelId!);
	if (tuple === undefined) return;

	const [_, states] = tuple;

	// If somebody is already connected to the channel, do not process.
	if (states.length !== 1) return;

	const freeChannels = voiceChannelStatesTuples.filter(([_, states]) => states.length === 0).length;
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

function onDisconnect(bot: Bot, voiceChannelStatesTuples: VoiceChannelStatesTuple[], previousState: VoiceState): void {
	const [_, states] = voiceChannelStatesTuples.find(([channel, _states]) => channel.id === previousState.channelId!)!;
	// If somebody is still connected to the channel, do not process.
	if (states.length !== 0) return;

	const freeChannelsCount = voiceChannelStatesTuples.filter(([_, states]) => states.length === 0).length;
	// If there is up to one free channel already, do not process.
	if (freeChannelsCount <= 1) return;

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
			(channel) => isVoice(channel) && channel.name! === configuration.guilds.channels.voiceChat,
		)
		.array()
		.toSorted(
			(a, b) => a.position === b.position ? Number(a.id - b.id) : a.position! - b.position!,
		);

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
