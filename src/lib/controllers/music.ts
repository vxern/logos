import { Bot, Embed, Guild, Interaction, sendMessage, VoiceState } from 'discordeno';
import * as Events from 'events';
import * as Lavaclient from 'lavaclient';
import {
	listingTypeToEmoji,
	Song,
	SongCollection,
	SongListing,
	SongListingContentTypes,
	SongStream,
} from 'logos/src/lib/commands/music/data/types.ts';
import { Client, localise } from 'logos/src/lib/client.ts';
import { reply } from 'logos/src/lib/interactions.ts';
import configuration from 'logos/src/configuration.ts';
import constants from 'logos/src/constants.ts';
import { mention, MentionTypes } from 'logos/src/formatting.ts';
import { defaultLocale } from 'logos/src/types.ts';

function setupMusicController(client: Client, guildId: bigint): void {
	client.features.music.controllers.set(guildId, createMusicController(client, guildId));
}

const disconnectTimeoutIdByGuildId = new Map<bigint, number>();

type MusicEvents = { queueUpdate: []; historyUpdate: []; stop: [] };

interface MusicController {
	readonly player: Lavaclient.Player;

	readonly events: Events.EventEmitter<MusicEvents>;

	voiceChannelId: bigint | undefined;
	feedbackChannelId: bigint | undefined;

	readonly listingHistory: SongListing[];
	currentListing: SongListing | undefined;
	readonly listingQueue: SongListing[];

	flags: {
		isDestroyed: boolean;
		loop: {
			song: boolean;
			collection: boolean;
		};
		breakLoop: boolean;
	};
}

function createMusicController(client: Client, guildId: bigint): MusicController {
	const player = client.features.music.node.createPlayer(guildId.toString());
	player.setVolume(configuration.music.defaultVolume);

	return {
		player,
		events: new Events.EventEmitter(),
		voiceChannelId: undefined,
		feedbackChannelId: undefined,
		listingHistory: [],
		currentListing: undefined,
		listingQueue: [],
		flags: { isDestroyed: false, loop: { song: false, collection: false }, breakLoop: false },
	};
}

function getCurrentSong(controller: MusicController): Song | SongStream | undefined {
	if (controller.currentListing === undefined) return undefined;

	if (isCollection(controller.currentListing.content)) {
		return getCurrentTrack(controller.currentListing.content);
	}

	return controller.currentListing.content;
}

function getCurrentTrack(collection: SongCollection): Song | undefined {
	return collection.songs[collection.position];
}

function isQueueVacant(listingQueue: SongListing[]): boolean {
	return listingQueue.length < configuration.music.limits.songs.queue;
}

function isQueueEmpty(listingQueue: SongListing[]): boolean {
	return listingQueue.length === 0;
}

function isHistoryVacant(listingHistory: SongListing[]): boolean {
	return listingHistory.length < configuration.music.limits.songs.history;
}

function isOccupied(player: Lavaclient.Player): boolean {
	return (player.track ?? undefined) !== undefined;
}

function isPaused(player: Lavaclient.Player): boolean {
	return player.paused;
}

function getVoiceState(client: Client, guildId: bigint, userId: bigint): VoiceState | undefined {
	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) return undefined;

	const voiceState = guild.voiceStates.get(userId);
	return voiceState;
}

type MusicAction = 'manage' | 'check';

function verifyVoiceState(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	controller: MusicController,
	voiceState: VoiceState | undefined,
	action: MusicAction,
): boolean {
	if (voiceState === undefined || voiceState.channelId === undefined) {
		const strings = {
			title: localise(client, 'music.strings.notInVc.title', interaction.locale)(),
			description: {
				toManage: localise(client, 'music.strings.notInVc.description.toManage', interaction.locale)(),
				toCheck: localise(client, 'music.strings.notInVc.description.toCheck', interaction.locale)(),
			},
		};

		reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: action === 'manage' ? strings.description.toManage : strings.description.toCheck,
				color: constants.colors.dullYellow,
			}],
		});

		return false;
	}

	if (isOccupied(controller.player) && voiceState.channelId !== controller.voiceChannelId) {
		const strings = {
			title: localise(client, 'music.options.play.strings.inDifferentVc.title', interaction.locale)(),
			description: localise(client, 'music.options.play.strings.inDifferentVc.description', interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});

		return false;
	}

	return true;
}

function verifyCanRequestPlayback(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	controller: MusicController,
	voiceState: VoiceState | undefined,
): boolean {
	const isVoiceStateVerified = verifyVoiceState([client, bot], interaction, controller, voiceState, 'manage');
	if (!isVoiceStateVerified) return false;

	if (!isQueueVacant(controller.listingQueue)) {
		const strings = {
			title: localise(client, 'music.options.play.strings.queueFull.title', interaction.locale)(),
			description: localise(client, 'music.options.play.strings.queueFull.description', interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});

		return false;
	}

	return true;
}

function verifyCanManagePlayback(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	controller: MusicController,
	voiceState: VoiceState | undefined,
): boolean {
	const isVoiceStateVerified = verifyVoiceState([client, bot], interaction, controller, voiceState, 'manage');
	if (!isVoiceStateVerified) return false;

	if (controller.currentListing !== undefined && !controller.currentListing.managerIds.includes(interaction.user.id)) {
		const strings = {
			title: localise(client, 'music.strings.cannotChange.title', interaction.locale)(),
			description: localise(client, 'music.strings.cannotChange.description', interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});

		return false;
	}

	return true;
}

function moveListingToHistory(controller: MusicController, listing: SongListing): void {
	if (!isHistoryVacant(controller.listingHistory)) {
		controller.listingHistory.shift();
	}

	// Adjust the position for being incremented automatically when played next time.
	if (isCollection(listing.content)) {
		listing.content.position--;
	}

	controller.listingHistory.push(listing);
	controller.events.emit('historyUpdate');
}

function tryClearDisconnectTimeout(guildId: bigint): void {
	const disconnectTimeoutId = disconnectTimeoutIdByGuildId.get(guildId);
	if (disconnectTimeoutId !== undefined) {
		disconnectTimeoutIdByGuildId.delete(guildId);
		clearTimeout(disconnectTimeoutId);
	}
}

function setDisconnectTimeout(client: Client, guildId: bigint): void {
	disconnectTimeoutIdByGuildId.set(
		guildId,
		setTimeout(() => reset(client, guildId), configuration.music.disconnectTimeout),
	);
}

function receiveNewListing(
	[client, bot]: [Client, Bot],
	guild: Guild,
	controller: MusicController,
	listing: SongListing,
	voiceChannelId: bigint,
	feedbackChannelId: bigint,
): void {
	function getVoiceStatesForChannel(guild: Guild, channelId: bigint): VoiceState[] {
		const guildVoiceStates = guild.voiceStates.array().filter((voiceState) => voiceState.channelId !== undefined);
		const relevantVoiceStates = guildVoiceStates.filter((voiceState) => voiceState.channelId! === channelId);

		return relevantVoiceStates;
	}

	tryClearDisconnectTimeout(guild.id);

	controller.listingQueue.push(listing);
	controller.events.emit('queueUpdate');

	const voiceStates = getVoiceStatesForChannel(guild, voiceChannelId);
	const managerIds = voiceStates.map((voiceState) => voiceState.userId);
	listing.managerIds = managerIds;

	// If the player is not connected to a voice channel, or if it is connected
	// to a different voice channel, connect to the new voice channel.
	if (!controller.player.connected) {
		controller.player.connect(voiceChannelId.toString(), { deafened: true });

		controller.voiceChannelId = voiceChannelId;
		controller.feedbackChannelId = feedbackChannelId;
	}

	const strings = {
		title: localise(client, 'music.options.play.strings.queued.title', defaultLocale)(),
		description: localise(client, 'music.options.play.strings.queued.description.public', defaultLocale)(
			{
				'title': listing.content.title,
				'user_mention': mention(listing.requestedBy, MentionTypes.User),
			},
		),
	};

	const embed: Embed = {
		title: `${constants.symbols.music.queued} ${strings.title}`,
		description: strings.description,
		color: constants.colors.lightGreen,
	};

	if (isOccupied(controller.player)) {
		return void sendMessage(bot, controller.feedbackChannelId!, { embeds: [embed] })
			.catch(() => client.log.warn('Failed to send music feedback message.'));
	}

	return advanceQueueAndPlay([client, bot], guild.id, controller);
}

function isCollection(object: Song | SongStream | SongCollection): object is SongCollection {
	return object.type === SongListingContentTypes.Collection;
}

function isExternal(object: Song | SongStream | SongCollection): object is SongStream {
	return object.type === SongListingContentTypes.File;
}

function isFirstInCollection(collection: SongCollection): boolean {
	return collection.position === 0;
}

function isLastInCollection(collection: SongCollection): boolean {
	return collection.position === collection.songs.length - 1;
}

function advanceQueueAndPlay([client, bot]: [Client, Bot], guildId: bigint, controller: MusicController): void {
	tryClearDisconnectTimeout(guildId);

	if (!controller.flags.loop.song) {
		if (controller.currentListing !== undefined && !isCollection(controller.currentListing.content)) {
			moveListingToHistory(controller, controller.currentListing);
			controller.currentListing = undefined;
		}

		if (
			!isQueueEmpty(controller.listingQueue) &&
			(controller.currentListing === undefined || !isCollection(controller.currentListing.content))
		) {
			controller.currentListing = controller.listingQueue.shift();
			controller.events.emit('queueUpdate');
		}
	}

	if (controller.currentListing?.content !== undefined && isCollection(controller.currentListing.content)) {
		if (isLastInCollection(controller.currentListing.content)) {
			if (controller.flags.loop.collection) {
				controller.currentListing.content.position = 0;
			} else {
				moveListingToHistory(controller, controller.currentListing);
				controller.currentListing = controller.listingQueue.shift();
				controller.events.emit('queueUpdate');
			}
		} else {
			if (controller.flags.loop.song) {
				controller.currentListing.content.position--;
			}

			controller.currentListing.content.position++;
		}
	}

	if (controller.currentListing === undefined) {
		setDisconnectTimeout(client, guildId);
		return;
	}

	return void loadSong([client, bot], guildId, controller, getCurrentSong(controller)!);
}

async function loadSong(
	[client, bot]: [Client, Bot],
	guildId: bigint,
	controller: MusicController,
	song: Song | SongStream,
): Promise<boolean> {
	const result = await controller.player.node.rest.loadTracks(song.url);

	if (result.loadType === 'LOAD_FAILED' || result.loadType === 'NO_MATCHES') {
		controller.flags.loop.song = false;

		const strings = {
			title: localise(client, 'music.options.play.strings.failedToLoad.title', defaultLocale)(),
			description: localise(client, 'music.options.play.strings.failedToLoad.description', defaultLocale)({
				'title': song.title,
			}),
		};

		sendMessage(bot, controller.feedbackChannelId!, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			}],
		});

		advanceQueueAndPlay([client, bot], guildId, controller);

		return false;
	}

	const track = result.tracks[0]!;

	if (controller.currentListing?.content !== undefined && isExternal(controller.currentListing.content)) {
		controller.currentListing.content.title = track.info.title;
	}

	const onTrackException = (_: string | null, error: Error) => {
		controller.flags.loop.song = false;

		client.log.warn(`Failed to play track: ${error}`);

		const strings = {
			title: localise(client, 'music.options.play.strings.failedToPlay.title', defaultLocale)(),
			description: localise(client, 'music.options.play.strings.failedToPlay.description', defaultLocale)({
				'title': song.title,
			}),
		};

		sendMessage(bot, controller.feedbackChannelId!, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			}],
		});
	};

	const onTrackEnd = () => {
		controller.player.off('trackException', onTrackException);

		if (controller.flags.isDestroyed) {
			setDisconnectTimeout(client, guildId);
			return;
		}

		if (controller.flags.breakLoop) {
			controller.flags.breakLoop = false;
			return;
		}

		advanceQueueAndPlay([client, bot], guildId, controller);
	};

	controller.player.once('trackException', onTrackException);
	controller.player.once('trackEnd', onTrackEnd);

	controller.player.play(track.track);

	const emoji = listingTypeToEmoji[song.type];

	const strings = {
		title: localise(client, 'music.options.play.strings.nowPlaying.title.nowPlaying', defaultLocale)({
			'listing_type': localise(client, localisationsBySongListingType[song.type], defaultLocale)(),
		}),
		description: {
			nowPlaying: localise(client, 'music.options.play.strings.nowPlaying.description.nowPlaying', defaultLocale),
			track: controller.currentListing?.content !== undefined && isCollection(controller.currentListing.content)
				? localise(client, 'music.options.play.strings.nowPlaying.description.track', defaultLocale)(
					{
						'index': controller.currentListing.content.position + 1,
						'number': controller.currentListing.content.songs.length,
						'title': controller.currentListing.content.title,
					},
				)
				: '',
		},
	};

	sendMessage(bot, controller.feedbackChannelId!, {
		embeds: [{
			title: `${emoji} ${strings.title}`,
			description: strings.description.nowPlaying(
				{
					'song_information': strings.description.track,
					'title': song.title,
					'url': song.url,
					'user_mention': mention(controller.currentListing!.requestedBy, MentionTypes.User),
				},
			),
			color: constants.colors.blue,
		}],
	});

	return true;
}

interface PositionControls {
	by: number;
	to: number;
}

function skip(controller: MusicController, skipCollection: boolean, { by, to }: Partial<PositionControls>): void {
	if (controller.currentListing?.content !== undefined && isCollection(controller.currentListing.content)) {
		if (skipCollection || isLastInCollection(controller.currentListing.content)) {
			if (!controller.flags.loop.collection) {
				moveListingToHistory(controller, controller.currentListing);
				controller.currentListing = undefined;
			} else {
				controller.currentListing.content.position = -1;
			}
		} else {
			if (by !== undefined || to !== undefined) {
				controller.flags.loop.song = false;
			}

			if (by !== undefined) {
				controller.currentListing.content.position += by - 1;
			}

			if (to !== undefined) {
				controller.currentListing.content.position = to - 2;
			}
		}
	}

	const listingsToMoveToHistory = Math.min(by ?? to ?? 0, controller.listingQueue.length);

	for (let _ = 0; _ < listingsToMoveToHistory; _++) {
		const listing = controller.listingQueue.shift();
		if (listing !== undefined) {
			moveListingToHistory(controller, listing);
		}
	}

	if (listingsToMoveToHistory !== 0) {
		controller.events.emit('queueUpdate');
	}

	return void controller.player.stop();
}

function unskip(
	[client, bot]: [Client, Bot],
	guildId: bigint,
	controller: MusicController,
	unskipCollection: boolean,
	{ by, to }: Partial<PositionControls>,
): void {
	if (controller.currentListing?.content !== undefined && isCollection(controller.currentListing.content)) {
		if (unskipCollection || isFirstInCollection(controller.currentListing.content)) {
			if (!controller.flags.loop.collection) {
				controller.currentListing.content.position -= 1;

				controller.listingQueue.unshift(controller.currentListing);
				controller.listingQueue.unshift(controller.listingHistory.pop()!);
				controller.events.emit('queueUpdate');
				controller.events.emit('historyUpdate');
				controller.currentListing = undefined;
			} else {
				controller.currentListing.content.position = -1;
			}
		} else {
			if (by !== undefined || to !== undefined) {
				controller.flags.loop.song = false;
			}

			if (by !== undefined) {
				controller.currentListing.content.position -= by + 1;
			}

			if (to !== undefined) {
				controller.currentListing.content.position = to! - 2;
			}

			if (by === undefined && to === undefined) {
				controller.currentListing.content.position -= 2;
			}
		}
	} else {
		const listingsToMoveToQueue = Math.min(by ?? to ?? 1, controller.listingHistory.length);

		if (controller.currentListing !== undefined) {
			controller.listingQueue.unshift(controller.currentListing);
			controller.events.emit('queueUpdate');
			controller.currentListing = undefined;
		}

		for (let _ = 0; _ < listingsToMoveToQueue; _++) {
			controller.listingQueue.unshift(controller.listingHistory.pop()!);
		}

		if (listingsToMoveToQueue !== 0) {
			controller.events.emit('queueUpdate');
			controller.events.emit('historyUpdate');
		}
	}

	if ((controller.player.track ?? undefined) !== undefined) {
		controller.player.stop();
	} else {
		advanceQueueAndPlay([client, bot], guildId, controller);
	}
}

function setVolume(player: Lavaclient.Player, volume: number): void {
	return void player.setVolume(volume);
}

function pause(player: Lavaclient.Player): void {
	return void player.pause(true);
}

function resume(player: Lavaclient.Player): void {
	return void player.pause(false);
}

function skipTo(player: Lavaclient.Player, timestampMilliseconds: number): void {
	return void player.seek(timestampMilliseconds);
}

function replay(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	controller: MusicController,
	replayCollection: boolean,
): void {
	if (replayCollection) {
		const previousLoopState = controller.flags.loop.collection;
		controller.flags.loop.collection = true;
		controller.player.once('trackStart', () => controller.flags.loop.collection = previousLoopState);
	} else {
		const previousLoopState = controller.flags.loop.song;
		controller.flags.loop.song = true;
		controller.player.once('trackStart', () => controller.flags.loop.song = previousLoopState);
	}

	if (controller.currentListing?.content !== undefined && isCollection(controller.currentListing.content)) {
		if (replayCollection) {
			controller.currentListing.content.position = -1;
		} else {
			controller.currentListing.content.position--;
		}
	}

	controller.flags.breakLoop = true;
	controller.player.stop();
	return advanceQueueAndPlay([client, bot], interaction.guildId!, controller);
}

function reset(client: Client, guildId: bigint): void {
	const controller = client.features.music.controllers.get(guildId);
	if (controller !== undefined) {
		controller.flags.isDestroyed = true;
		controller.events.emit('stop');
		controller.player.stop();
		controller.player.pause(false);
		controller.player.disconnect();
	}

	return setupMusicController(client, guildId);
}

function remove(controller: MusicController, index: number): SongListing | undefined {
	const listing = controller.listingQueue.splice(index, 1)?.at(0);
	controller.events.emit('queueUpdate');
	return listing;
}

const localisationsBySongListingType = {
	[SongListingContentTypes.Song]: 'music.options.play.strings.nowPlaying.title.type.song',
	[SongListingContentTypes.File]: 'music.options.play.strings.nowPlaying.title.type.external',
	[SongListingContentTypes.Collection]: 'music.options.play.strings.nowPlaying.title.type.songCollection',
};

export {
	getVoiceState,
	isCollection,
	isOccupied,
	isPaused,
	isQueueEmpty,
	isQueueVacant,
	pause,
	receiveNewListing,
	remove,
	replay,
	reset,
	resume,
	setupMusicController,
	setVolume,
	skip,
	skipTo,
	unskip,
	verifyCanManagePlayback,
	verifyCanRequestPlayback,
	verifyVoiceState,
};
export type { MusicController };
