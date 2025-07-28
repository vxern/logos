import type { Client } from "rost/client";
import { Collector } from "rost/collectors";
import type { DynamicVoiceChannel } from "rost/models/documents/guild";
import type { Guild } from "rost/models/guild";
import { LocalService } from "rost/services/service";

type VoiceChannel = Rost.Channel & { type: Discord.ChannelTypes.GuildVoice };

function isVoice(channel: Rost.Channel): channel is VoiceChannel {
	return channel.type === Discord.ChannelTypes.GuildVoice;
}

type WithVoiceStates<T> = T & { voiceStates: Rost.VoiceState[] };
type DynamicVoiceChannelData = {
	original: WithVoiceStates<{ channel: Rost.Channel }>;
	copies: WithVoiceStates<{ id: bigint }>[];
	configuration: DynamicVoiceChannel;
};

class DynamicVoiceChannelService extends LocalService {
	readonly oldVoiceStates: Map</*userId:*/ bigint, Rost.VoiceState>;

	readonly #voiceStateUpdates: Collector<"voiceStateUpdate">;

	get configuration(): NonNullable<Guild["features"]["dynamicVoiceChannels"]> {
		return this.guildDocument.feature("dynamicVoiceChannels");
	}

	get channels(): DynamicVoiceChannelData[] {
		const channelIdConfigurationTuples = this.configuration.channels.map<[bigint, DynamicVoiceChannel]>(
			(channelConfiguration) => [BigInt(channelConfiguration.id), channelConfiguration],
		);
		const originalChannelIds = channelIdConfigurationTuples.map(([channelId, _]) => channelId);

		const channelsAll = this.guild.channels
			.filter((channel) => isVoice(channel))
			.array()
			.sort((a, b) => {
				if (a.position === b.position) {
					return Number(a.id - b.id);
				}

				if (a.position === undefined) {
					return b.position ?? -1;
				}

				if (b.position === undefined) {
					return a.position ?? 1;
				}

				return a.position - b.position;
			});
		const channelIds = channelsAll.map((channel) => channel.id);

		const voiceStateByUserId = this.guild.voiceStates
			.filter((voiceState) => voiceState.channelId !== undefined)
			.array();
		const voiceStatesByChannelId = new Map<bigint, Rost.VoiceState[]>(
			channelIds.map((channelId) => [
				channelId,
				voiceStateByUserId.filter((voiceState) => voiceState.channelId === channelId),
			]),
		);

		const originalChannels = channelsAll.filter((channel) => originalChannelIds.includes(channel.id));

		const originalChannelById = new Map<bigint, DynamicVoiceChannelData>();
		for (const channel of channelsAll) {
			const voiceStates = voiceStatesByChannelId.get(channel.id) ?? [];

			const originalChannel = originalChannels.find((originalChannel) => originalChannel.name === channel.name);
			if (originalChannel === undefined) {
				continue;
			}

			const configuration = channelIdConfigurationTuples.find(
				([channelId, _]) => channelId === originalChannel.id,
			)?.[1];
			if (configuration === undefined) {
				continue;
			}

			if (!originalChannelById.has(originalChannel.id)) {
				const voiceStates = voiceStatesByChannelId.get(originalChannel.id) ?? [];
				originalChannelById.set(originalChannel.id, {
					original: { channel: originalChannel, voiceStates },
					configuration,
					copies: [],
				});
			}

			// If the channel is a original channel.
			if (originalChannelIds.includes(channel.id)) {
				continue;
			}

			originalChannelById.get(originalChannel.id)?.copies.push({ id: channel.id, voiceStates });
		}

		return Array.from(originalChannelById.values());
	}

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "DynamicVoiceChannelService", guildId });

		this.oldVoiceStates = new Map();

		this.#voiceStateUpdates = new Collector({ guildId });
	}

	async start(): Promise<void> {
		this.#voiceStateUpdates.onCollect(this.#handleVoiceStateUpdate.bind(this));

		await this.client.registerCollector("voiceStateUpdate", this.#voiceStateUpdates);

		await this.#syncChannelsToVoiceStates();
	}

	async stop(): Promise<void> {
		await this.#voiceStateUpdates.close();

		this.oldVoiceStates.clear();
	}

	async #syncChannelsToVoiceStates(): Promise<void> {
		this.log.info("Syncing channels to voice states...");

		const voiceStatesAll = this.channels.flatMap((channel) => [
			...channel.original.voiceStates,
			...channel.copies.flatMap((channel) => channel.voiceStates),
		]);
		for (const voiceState of voiceStatesAll) {
			await this.#handleVoiceStateUpdate(voiceState);
		}

		for (const { original, copies, configuration } of this.channels) {
			const groupChannelsCount = copies.length + 1;
			const surplusVacantChannels = Math.max(
				0,
				(configuration.maximum ?? constants.defaults.MAXIMUM_VOICE_CHANNELS) - groupChannelsCount,
			);

			const isoriginalVacant = original.voiceStates.length === 0;
			const vacantChannelIds = copies.filter((channel) => channel.voiceStates.length === 0);
			const minimumVoiceChannels = configuration.minimum ?? constants.defaults.MINIMUM_VOICE_CHANNELS;
			if (
				(isoriginalVacant ? 1 : 0) + vacantChannelIds.length ===
				(configuration.minimum ?? constants.defaults.MINIMUM_VOICE_CHANNELS) + 1
			) {
				return;
			}

			const channelIdsToDelete = vacantChannelIds
				.slice(Math.min((minimumVoiceChannels === 0 ? 0 : minimumVoiceChannels - 1) - surplusVacantChannels, 0))
				.map((channel) => channel.id);
			for (const channelId of channelIdsToDelete) {
				await this.client.bot.helpers.deleteChannel(channelId);
			}
		}

		this.log.info("Channels and voice states have been synced.");
	}

	async #handleVoiceStateUpdate(newVoiceState: Rost.VoiceState): Promise<void> {
		const oldVoiceState = this.oldVoiceStates.get(newVoiceState.userId);

		if (oldVoiceState?.channelId === undefined) {
			await this.#handleConnect(newVoiceState);
		} else if (newVoiceState.channelId === undefined) {
			await this.#handleDisconnect(oldVoiceState);
		} else {
			await this.#handleConnect(newVoiceState);
			await this.#handleDisconnect(oldVoiceState);
		}

		this.oldVoiceStates.set(newVoiceState.userId, newVoiceState);
	}

	async #handleConnect(newVoiceState: Rost.VoiceState): Promise<void> {
		const channels = this.channels;
		if (channels === undefined) {
			return;
		}

		const channelId = newVoiceState.channelId;
		if (channelId === undefined) {
			return;
		}

		const channelData = channels.find(
			(channel) =>
				channel.original.channel.id === channelId || channel.copies.some((channel) => channel.id === channelId),
		);
		if (channelData === undefined) {
			return;
		}

		const { original, configuration, copies } = channelData;

		const channel =
			original.channel.id === channelId ? original : copies.find((channel) => channel.id === channelId);
		if (channel === undefined) {
			return;
		}

		const vacantChannels = [original, ...copies].filter((channel) => channel.voiceStates.length === 0);
		if (vacantChannels.length === (configuration.minimum ?? constants.defaults.MINIMUM_VOICE_CHANNELS) + 1) {
			return;
		}

		// If the channel limit has already been reached, do not process.
		const groupChannels = copies.length + 1;
		if (groupChannels >= (configuration.maximum ?? constants.defaults.MAXIMUM_VOICE_CHANNELS)) {
			return;
		}

		if (original.channel.name === undefined) {
			return;
		}

		this.log.info(`First user joined ${this.client.diagnostics.channel(channelId)}. Creating new instance...`);

		await this.client.bot.helpers
			.createChannel(this.guildId, {
				name: original.channel.name,
				type: Discord.ChannelTypes.GuildVoice,
				parentId: original.channel.parentId,
				position: original.channel.position,
			})
			.catch((error) =>
				this.log.warn(
					error,
					`Failed to create voice channel on ${this.client.diagnostics.guild(this.guildId)}.`,
				),
			);
	}

	async #handleDisconnect(oldVoiceState: Rost.VoiceState): Promise<void> {
		const channels = this.channels;
		if (channels === undefined) {
			return;
		}

		const channelId = oldVoiceState.channelId;
		if (channelId === undefined) {
			return;
		}

		const channelData = channels.findLast(
			(channel) =>
				channel.original.channel.id === channelId || channel.copies.some((channel) => channel.id === channelId),
		);
		if (channelData === undefined) {
			return;
		}

		const { original, configuration, copies } = channelData;

		const channel =
			original.channel.id === channelId ? original : copies.find((channel) => channel.id === channelId);
		if (channel === undefined) {
			return;
		}

		// If somebody is still connected to the channel, do not process.
		if (channel.voiceStates.length > 0) {
			return;
		}

		const isoriginalVacant = original.voiceStates.length === 0;
		const vacantChannels = copies.filter((channel) => channel.voiceStates.length === 0);
		if (
			(isoriginalVacant ? 1 : 0) + vacantChannels.length ===
			(configuration.minimum ?? constants.defaults.MINIMUM_VOICE_CHANNELS) + 1
		) {
			return;
		}

		const lastVacantChannelId = vacantChannels.at(-1)?.id;
		if (lastVacantChannelId === undefined) {
			return;
		}

		this.log.info(`Last user left ${this.client.diagnostics.channel(lastVacantChannelId)}. Deleting instance...`);

		this.client.bot.helpers
			.deleteChannel(lastVacantChannelId)
			.catch((error) =>
				this.log.warn(
					error,
					`Failed to delete voice channel on ${this.client.diagnostics.guild(this.guildId)}.`,
				),
			);
	}
}

export { DynamicVoiceChannelService };
