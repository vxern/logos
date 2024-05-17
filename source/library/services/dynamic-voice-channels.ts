import type { Client } from "logos/client";
import { Collector } from "logos/collectors";
import type { DynamicVoiceChannel, Guild } from "logos/database/guild";
import { LocalService } from "logos/services/service";

type VoiceChannel = Logos.Channel & { type: Discord.ChannelTypes.GuildVoice };

function isVoice(channel: Logos.Channel): channel is VoiceChannel {
	return channel.type === Discord.ChannelTypes.GuildVoice;
}

type WithVoiceStates<T> = T & { voiceStates: Logos.VoiceState[] };
type DynamicVoiceChannelData = {
	parent: WithVoiceStates<{ channel: Logos.Channel }>;
	children: WithVoiceStates<{ id: bigint }>[];
	configuration: DynamicVoiceChannel;
};

class DynamicVoiceChannelService extends LocalService {
	readonly oldVoiceStates: Map</*userId:*/ bigint, Logos.VoiceState>;

	readonly #_voiceStateUpdates: Collector<"voiceStateUpdate">;

	get configuration(): NonNullable<Guild["dynamicVoiceChannels"]> {
		return this.guildDocument.dynamicVoiceChannels!;
	}

	get channels(): DynamicVoiceChannelData[] {
		const channelIdConfigurationTuples = this.configuration.channels.map<[bigint, DynamicVoiceChannel]>(
			(channelConfiguration) => [BigInt(channelConfiguration.id), channelConfiguration],
		);
		const parentChannelIds = channelIdConfigurationTuples.map(([channelId, _]) => channelId);

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
		const voiceStatesByChannelId = new Map<bigint, Logos.VoiceState[]>(
			channelIds.map((channelId) => [
				channelId,
				voiceStateByUserId.filter((voiceState) => voiceState.channelId === channelId),
			]),
		);

		const parentChannels = channelsAll.filter((channel) => parentChannelIds.includes(channel.id));

		const parentChannelById = new Map<bigint, DynamicVoiceChannelData>();
		for (const channel of channelsAll) {
			const voiceStates = voiceStatesByChannelId.get(channel.id) ?? [];

			const parentChannel = parentChannels.find((parentChannel) => parentChannel.name === channel.name);
			if (parentChannel === undefined) {
				continue;
			}

			const configuration = channelIdConfigurationTuples.find(
				([channelId, _]) => channelId === parentChannel.id,
			)?.[1];
			if (configuration === undefined) {
				continue;
			}

			if (!parentChannelById.has(parentChannel.id)) {
				const voiceStates = voiceStatesByChannelId.get(parentChannel.id) ?? [];
				parentChannelById.set(parentChannel.id, {
					parent: { channel: parentChannel, voiceStates },
					configuration,
					children: [],
				});
			}

			// If the channel is a parent channel.
			if (parentChannelIds.includes(channel.id)) {
				continue;
			}

			parentChannelById.get(parentChannel.id)?.children.push({ id: channel.id, voiceStates });
		}

		return Array.from(parentChannelById.values());
	}

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "DynamicVoiceChannelService", guildId });

		this.oldVoiceStates = new Map();

		this.#_voiceStateUpdates = new Collector({ guildId });
	}

	async start(): Promise<void> {
		this.#_voiceStateUpdates.onCollect(this.#_handleVoiceStateUpdate.bind(this));

		await this.client.registerCollector("voiceStateUpdate", this.#_voiceStateUpdates);

		const voiceStatesAll = this.channels.flatMap((channel) => [
			...channel.parent.voiceStates,
			...channel.children.flatMap((channel) => channel.voiceStates),
		]);
		for (const voiceState of voiceStatesAll) {
			await this.#_handleVoiceStateUpdate(voiceState);
		}

		for (const { parent, children, configuration } of this.channels) {
			const groupChannelsCount = children.length + 1;
			const surplusVacantChannels = Math.max(
				0,
				(configuration.maximum ?? constants.defaults.MAXIMUM_VOICE_CHANNELS) - groupChannelsCount,
			);

			const isParentVacant = parent.voiceStates.length === 0;
			const vacantChannelIds = children.filter((channel) => channel.voiceStates.length === 0);
			const minimumVoiceChannels = configuration.minimum ?? constants.defaults.MINIMUM_VOICE_CHANNELS;
			if (
				(isParentVacant ? 1 : 0) + vacantChannelIds.length ===
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
	}

	async stop(): Promise<void> {
		await this.#_voiceStateUpdates.close();

		this.oldVoiceStates.clear();
	}

	async #_handleVoiceStateUpdate(newVoiceState: Logos.VoiceState): Promise<void> {
		const oldVoiceState = this.oldVoiceStates.get(newVoiceState.userId);

		if (oldVoiceState === undefined || oldVoiceState.channelId === undefined) {
			await this.#_handleConnect(newVoiceState);
		} else if (newVoiceState.channelId === undefined) {
			await this.#_handleDisconnect(oldVoiceState);
		} else {
			await this.#_handleConnect(newVoiceState);
			await this.#_handleDisconnect(oldVoiceState);
		}

		this.oldVoiceStates.set(newVoiceState.userId, newVoiceState);
	}

	async #_handleConnect(newVoiceState: Logos.VoiceState): Promise<void> {
		const channels = this.channels;
		if (channels === undefined) {
			return;
		}

		const channelId = newVoiceState.channelId ?? 0n;

		const channelData = channels.find(
			(channel) =>
				channel.parent.channel.id === channelId || channel.children.some((channel) => channel.id === channelId),
		);
		if (channelData === undefined) {
			return;
		}

		const { parent, configuration, children } = channelData;

		const channel = parent.channel.id === channelId ? parent : children.find((channel) => channel.id === channelId);
		if (channel === undefined) {
			return;
		}

		// If somebody was already connected to the channel, do not process.
		if (channel.voiceStates.length !== 1) {
			return;
		}

		const vacantChannels = [parent, ...children].filter((channel) => channel.voiceStates.length === 0);
		if (vacantChannels.length === (configuration.minimum ?? constants.defaults.MINIMUM_VOICE_CHANNELS) + 1) {
			return;
		}

		// If the channel limit has already been reached, do not process.
		const groupChannels = children.length + 1;
		if (groupChannels >= (configuration.maximum ?? constants.defaults.MAXIMUM_VOICE_CHANNELS)) {
			return;
		}

		if (parent.channel.name === undefined) {
			return;
		}

		this.client.bot.helpers
			.createChannel(this.guildId, {
				name: parent.channel.name,
				type: Discord.ChannelTypes.GuildVoice,
				parentId: parent.channel.parentId,
				position: parent.channel.position,
			})
			.catch(() =>
				this.log.warn(`Failed to create voice channel on ${this.client.diagnostics.guild(this.guildId)}.`),
			);
	}

	async #_handleDisconnect(oldVoiceState: Logos.VoiceState): Promise<void> {
		const channels = this.channels;
		if (channels === undefined) {
			return;
		}

		const channelId = oldVoiceState.channelId ?? 0n;

		const channelData = channels.findLast(
			(channel) =>
				channel.parent.channel.id === channelId || channel.children.some((channel) => channel.id === channelId),
		);
		if (channelData === undefined) {
			return;
		}

		const { parent, configuration, children } = channelData;

		const channel = parent.channel.id === channelId ? parent : children.find((channel) => channel.id === channelId);
		if (channel === undefined) {
			return;
		}

		// If somebody is still connected to the channel, do not process.
		if (channel.voiceStates.length !== 0) {
			return;
		}

		const isParentVacant = parent.voiceStates.length === 0;
		const vacantChannels = children.filter((channel) => channel.voiceStates.length === 0);
		if (
			(isParentVacant ? 1 : 0) + vacantChannels.length ===
			(configuration.minimum ?? constants.defaults.MINIMUM_VOICE_CHANNELS) + 1
		) {
			return;
		}

		const lastVacantChannelId = vacantChannels.at(-1)?.id;
		if (lastVacantChannelId === undefined) {
			return;
		}

		this.client.bot.helpers
			.deleteChannel(lastVacantChannelId)
			.catch(() =>
				this.log.warn(`Failed to delete voice channel on ${this.client.diagnostics.guild(this.guildId)}.`),
			);
	}
}

export { DynamicVoiceChannelService };
