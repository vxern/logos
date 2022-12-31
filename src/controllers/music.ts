import {
	ApplicationCommandFlags,
	Bot,
	editOriginalInteractionResponse,
	Embed,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
	VoiceState,
} from 'discordeno';
import { Player } from 'lavadeno';
import { LoadType } from 'lavalink_types';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import {
	listingTypeToEmoji,
	Song,
	SongCollection,
	SongListing,
	SongListingContentTypes,
	SongStream,
} from 'logos/src/commands/music/data/types.ts';
import { Client } from 'logos/src/client.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

function setupMusicController(client: Client, guildId: bigint): void {
	client.features.music.controllers.set(guildId, createMusicController(client, guildId));
}

const disconnectTimeoutIdByGuildId = new Map<bigint, number>();

interface MusicController {
	readonly player: Player;

	voiceChannelId: bigint | undefined;
	feedbackChannelId: bigint | undefined;

	readonly listingHistory: SongListing[];
	currentListing: SongListing | undefined;
	readonly listingQueue: SongListing[];

	flags: {
		isDestroyed: boolean;
		loop: boolean;
		breakLoop: boolean;
	};
}

function createMusicController(
	client: Client,
	guildId: bigint,
): MusicController {
	return {
		player: client.features.music.node.createPlayer(guildId),
		voiceChannelId: undefined,
		feedbackChannelId: undefined,
		listingHistory: [],
		currentListing: undefined,
		listingQueue: [],
		flags: {
			isDestroyed: false,
			loop: false,
			breakLoop: false,
		},
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

function isOccupied(player: Player): boolean {
	return (player.track ?? undefined) !== undefined;
}

function isPaused(player: Player): boolean {
	return player.paused;
}

function getVoiceState(client: Client, interaction: Interaction): VoiceState | undefined {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return undefined;

	const voiceState = guild.voiceStates.get(interaction.user.id);
	return voiceState;
}

function verifyVoiceState(
	bot: Bot,
	interaction: Interaction,
	controller: MusicController,
	voiceState: VoiceState | undefined,
): boolean {
	if (voiceState === undefined || voiceState.channelId === undefined) {
		sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [
						{
							description: localise(Commands.music.options.play.strings.mustBeInVoiceChannel, interaction.locale),
							color: constants.colors.dullYellow,
						},
					],
				},
			},
		);
		return false;
	}

	if (isOccupied(controller.player) && voiceState.channelId !== controller.voiceChannelId) {
		sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(
							Commands.music.options.play.strings.alreadyPlayingInAnotherVoiceChannel,
							interaction.locale,
						),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
		return false;
	}

	return true;
}

function verifyCanRequestPlayback(
	bot: Bot,
	interaction: Interaction,
	controller: MusicController,
	voiceState: VoiceState | undefined,
): boolean {
	const isVoiceStateVerified = verifyVoiceState(bot, interaction, controller, voiceState);
	if (!isVoiceStateVerified) return false;

	if (!isQueueVacant(controller.listingQueue)) {
		sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.music.options.play.strings.queueIsFull, interaction.locale),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
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
	interaction: Interaction | undefined,
	guildId: bigint,
	controller: MusicController,
	listing: SongListing,
	voiceChannelId: bigint,
	feedbackChannelId: bigint,
): void {
	tryClearDisconnectTimeout(guildId);

	controller.listingQueue.push(listing);

	// If the player is not connected to a voice channel, or if it is connected
	// to a different voice channel, connect to the new voice channel.
	if (!controller.player.connected) {
		controller.player.connect(voiceChannelId, { deafen: true });

		controller.voiceChannelId = voiceChannelId;
		controller.feedbackChannelId = feedbackChannelId;
	}

	// TODO(vxern): If there are no users in the voice channel, make this message ephemeral and localise it appropriately.

	const queuedString = localise(Commands.music.options.play.strings.queued.header, defaultLocale);
	const embed: Embed = {
		title: `👍 ${queuedString}`,
		description: localise(Commands.music.options.play.strings.queued.body, defaultLocale)(listing.content.title),
		color: constants.colors.lightGreen,
	};

	if (isOccupied(controller.player)) {
		if (interaction === undefined) {
			return void sendMessage(bot, controller.feedbackChannelId!, { embeds: [embed] });
		}

		return void sendInteractionResponse(bot, interaction.id, interaction.token, {
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: { embeds: [embed] },
		});
	}

	return advanceQueueAndPlay([client, bot], interaction, guildId, controller, false);
}

function isCollection(object: Song | SongStream | SongCollection | undefined): object is SongCollection {
	return object?.type === SongListingContentTypes.Collection;
}

function isExternal(object: Song | SongStream | SongCollection | undefined): object is SongStream {
	return object?.type === SongListingContentTypes.External;
}

function isFirstInCollection(collection: SongCollection): boolean {
	return collection.position === 0;
}

function isLastInCollection(collection: SongCollection): boolean {
	return collection.position === collection.songs.length - 1;
}

function advanceQueueAndPlay(
	[client, bot]: [Client, Bot],
	interaction: Interaction | undefined,
	guildId: bigint,
	controller: MusicController,
	isDeferred: boolean,
): void {
	tryClearDisconnectTimeout(guildId);

	if (!controller.flags.loop) {
		if (controller.currentListing !== undefined && !isCollection(controller.currentListing?.content)) {
			moveListingToHistory(controller, controller.currentListing);
			controller.currentListing = undefined;
		}

		if (
			!isQueueEmpty(controller.listingQueue) &&
			(controller.currentListing === undefined || !isCollection(controller.currentListing?.content))
		) {
			controller.currentListing = controller.listingQueue.shift();
		}
	}

	if (isCollection(controller.currentListing?.content)) {
		if (isLastInCollection(controller.currentListing!.content)) {
			if (controller.flags.loop) {
				controller.currentListing!.content.position = 0;
			} else {
				moveListingToHistory(controller, controller.currentListing!);
				controller.currentListing = controller.listingQueue.shift();
			}
		} else {
			controller.currentListing!.content.position++;
		}
	}

	if (controller.currentListing === undefined) {
		setDisconnectTimeout(client, guildId);

		// TODO(vxern): If there are no users in the voice channel, make this message ephemeral and localise it appropriately.

		const allDoneString = localise(Commands.music.strings.allDone.header, defaultLocale);

		return void sendMessage(bot, controller.feedbackChannelId!, {
			embeds: [{
				title: `👏 ${allDoneString}`,
				description: localise(Commands.music.strings.allDone.body, defaultLocale),
				color: constants.colors.blue,
			}],
		});
	}

	return void loadSong([client, bot], interaction, guildId, controller, getCurrentSong(controller)!, isDeferred);
}

async function loadSong(
	[client, bot]: [Client, Bot],
	interaction: Interaction | undefined,
	guildId: bigint,
	controller: MusicController,
	song: Song | SongStream,
	isDeferred: boolean,
): Promise<boolean> {
	const result = await controller.player.node.rest.loadTracks(song.url);

	if (result.loadType === LoadType.LoadFailed || result.loadType === LoadType.NoMatches) {
		const embed: Embed = {
			title: localise(Commands.music.strings.couldNotLoadTrack.header, defaultLocale),
			description: localise(Commands.music.strings.couldNotLoadTrack.body, defaultLocale)(song.title),
			color: constants.colors.red,
		};

		if (interaction === undefined) {
			sendMessage(bot, controller.feedbackChannelId!, { embeds: [embed] });
			return false;
		}

		if (isDeferred) {
			editOriginalInteractionResponse(bot, interaction.token, { embeds: [embed] });
			return false;
		}

		sendInteractionResponse(bot, interaction.id, interaction.token, {
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: { embeds: [embed] },
		});
		return false;
	}

	const track = result.tracks[0]!;

	if (isExternal(controller.currentListing?.content)) {
		controller.currentListing!.content.title = track.info.title;
	}

	controller.player.once('trackEnd', (_track, _reason) => {
		if (controller.flags.isDestroyed) {
			setDisconnectTimeout(client, guildId);
			return;
		}

		if (controller.flags.breakLoop) {
			controller.flags.breakLoop = false;
			return;
		}

		advanceQueueAndPlay([client, bot], undefined, guildId, controller, false);
	});

	controller.player.play(track.track);

	const emoji = listingTypeToEmoji[song.type];
	const playingString = localise(Commands.music.strings.playing.header, defaultLocale);
	const type = localise(localisationsBySongListingType[song.type], defaultLocale).toLowerCase();

	const embed: Embed = {
		title: `${emoji} ${playingString} ${type}`,
		description: localise(Commands.music.strings.playing.body, defaultLocale)(
			isCollection(controller.currentListing?.content)
				? localise(Commands.music.strings.playing.parts.displayTrack, defaultLocale)(
					controller.currentListing!.content.position + 1,
					controller.currentListing!.content.songs.length,
					controller.currentListing!.content.title,
				)
				: '',
			song.title,
			song.url,
			mention(controller.currentListing!.requestedBy, MentionTypes.User),
		),
		color: constants.colors.invisible,
	};

	if (interaction === undefined) {
		sendMessage(bot, controller.feedbackChannelId!, { embeds: [embed] });
		return true;
	}

	if (isDeferred) {
		editOriginalInteractionResponse(bot, interaction.token, { embeds: [embed] });
		return true;
	}

	sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: { embeds: [embed] },
		},
	);
	return true;
}

interface PositionControls {
	by: number;
	to: number;
}

function skip(controller: MusicController, skipCollection: boolean, { by, to }: Partial<PositionControls>): void {
	if (isCollection(controller.currentListing?.content)) {
		if (skipCollection || isLastInCollection(controller.currentListing!.content)) {
			moveListingToHistory(controller, controller.currentListing!);
			controller.currentListing = undefined;
		} else {
			if (by !== undefined) {
				controller.currentListing!.content.position += by - 1;
			}

			if (to !== undefined) {
				controller.currentListing!.content.position = to - 2;
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

	return void controller.player.stop();
}

function unskip(
	[client, bot]: [Client, Bot],
	guildId: bigint,
	controller: MusicController,
	unskipCollection: boolean,
	{ by, to }: Partial<PositionControls>,
): void {
	if (isCollection(controller.currentListing?.content)) {
		if (unskipCollection || isFirstInCollection(controller.currentListing!.content)) {
			controller.listingQueue.unshift(controller.currentListing!);
			controller.listingQueue.unshift(controller.listingHistory.pop()!);
			controller.currentListing = undefined;
		} else {
			if (by !== undefined) {
				controller.currentListing!.content.position -= by + 1;
			}

			if (to !== undefined) {
				controller.currentListing!.content.position = to! - 2;
			}

			if (by === undefined && to === undefined) {
				controller.currentListing!.content.position -= 2;
			}
		}
	} else {
		const listingsToMoveToQueue = Math.min(by ?? to ?? 1, controller.listingHistory.length);

		console.debug(`${listingsToMoveToQueue} listings to move to queue`);

		if (controller.currentListing !== undefined) {
			console.debug('moving current listing to queue');

			controller.listingQueue.unshift(controller.currentListing);
			controller.currentListing = undefined;
		}

		for (let _ = 0; _ < listingsToMoveToQueue; _++) {
			controller.listingQueue.unshift(controller.listingHistory.pop()!);
		}
	}

	if ((controller.player.track ?? undefined) !== undefined) {
		controller.player.stop();
	} else {
		advanceQueueAndPlay([client, bot], undefined, guildId, controller, false);
	}
}

function setVolume(player: Player, volume: number): void {
	return void player.setVolume(volume);
}

function pause(player: Player): void {
	return void player.pause(true);
}

function resume(player: Player): void {
	return void player.pause(false);
}

function replay(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	controller: MusicController,
	replayCollection: boolean,
): void {
	const previousLoopState = controller.flags.loop;
	controller.flags.loop = true;
	controller.player.once('trackStart', () => controller.flags.loop = previousLoopState);

	if (isCollection(controller.currentListing?.content)) {
		if (replayCollection) {
			controller.currentListing!.content.position = -1;
		} else {
			controller.currentListing!.content.position--;
		}
	}

	controller.flags.breakLoop = true;
	controller.player.stop();
	return advanceQueueAndPlay([client, bot], interaction, interaction.guildId!, controller, false);
}

function reset(client: Client, guildId: bigint): void {
	const controller = client.features.music.controllers.get(guildId);
	if (controller !== undefined) {
		controller.flags.isDestroyed = true;
		controller.player.destroy();
	}

	return setupMusicController(client, guildId);
}

const localisationsBySongListingType = {
	[SongListingContentTypes.Song]: Commands.music.strings.type.song,
	[SongListingContentTypes.External]: Commands.music.strings.type.external,
	[SongListingContentTypes.Collection]: Commands.music.strings.type.songCollection,
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
	replay,
	reset,
	resume,
	setupMusicController,
	setVolume,
	skip,
	unskip,
	verifyCanRequestPlayback,
	verifyVoiceState,
};
export type { MusicController };
