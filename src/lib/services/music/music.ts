import constants from "../../../constants/constants";
import { defaultLocale } from "../../../constants/language";
import defaults from "../../../defaults";
import { MentionTypes, mention } from "../../../formatting";
import { Client, localise } from "../../client";
import {
	Song,
	SongCollection,
	SongListing,
	SongListingType,
	SongStream,
	listingTypeToEmoji,
} from "../../commands/music/data/types";
import { Guild, timeStructToMilliseconds } from "../../database/structs/guild";
import { reply } from "../../interactions";
import { LocalService } from "../service";
import * as Discord from "discordeno";
import { EventEmitter } from "events";
import * as Lavaclient from "lavaclient";

interface PositionControls {
	by: number;
	to: number;
}

interface Session {
	events: EventEmitter;

	player: Lavaclient.Player;
	channelId: bigint;

	disconnectTimeout: NodeJS.Timeout | undefined;

	listings: {
		history: SongListing[];
		current: SongListing | undefined;
		queue: SongListing[];
	};

	flags: {
		isDestroyed: boolean;
		loop: {
			song: boolean;
			collection: boolean;
		};
		breakLoop: boolean;
	};
}

type Configuration = NonNullable<Guild["features"]["social"]["features"]>["music"];

class MusicService extends LocalService {
	private session: Session | undefined;

	get configuration(): Configuration | undefined {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return undefined;
		}

		return guildDocument.data.features.social.features?.music;
	}

	get channelId(): bigint | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		return session.channelId;
	}

	get events(): EventEmitter | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		return session.events;
	}

	get volume(): number | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		return session.player.volume;
	}

	get history(): SongListing[] | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.history;
	}

	get current(): SongListing | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.current;
	}

	get currentSong(): Song | SongStream | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		const current = session.listings.current;
		if (current === undefined) {
			return undefined;
		}

		if (isCollection(current.content)) {
			return current.content.songs[current.content.position];
		}

		return current.content;
	}

	get queue(): SongListing[] | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.queue;
	}

	get isQueueVacant(): boolean | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.queue.length < defaults.MAX_QUEUE_ENTRIES;
	}

	get isQueueEmpty(): boolean | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.queue.length === 0;
	}

	get isHistoryVacant(): boolean | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.history.length < defaults.MAX_HISTORY_ENTRIES;
	}

	get isHistoryEmpty(): boolean | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.history.length === 0;
	}

	get isOccupied(): boolean | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		return session.player.track !== undefined;
	}

	get isPaused(): boolean | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		return session.player.paused;
	}

	get playingSince(): number | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		return session.player.playingSince;
	}

	constructor(client: Client, guildId: bigint) {
		super(client, guildId);
		this.session = undefined;
	}

	async voiceStateUpdate(bot: Discord.Bot, __: Discord.VoiceState): Promise<void> {
		const [guild, session] = [this.guild, this.session];
		if (guild === undefined || session === undefined) {
			return;
		}

		const voiceStates = guild.voiceStates.array().filter((voiceState) => voiceState.channelId === session.channelId);
		if (voiceStates.length === 1 && voiceStates.at(0)?.userId === bot.id) {
			this.destroySession();
		}
	}

	async createSession(channelId: bigint): Promise<Session | undefined> {
		const [configuration, oldSession] = [this.configuration, this.session];
		if (configuration === undefined) {
			return undefined;
		}

		if (!configuration.enabled) {
			return undefined;
		}

		const player = this.client.services.music.lavalink.node.createPlayer(this.guildIdString);

		player.setVolume(configuration.implicitVolume);

		const session = {
			events: oldSession?.events ?? new EventEmitter(),
			player,
			disconnectTimeout: undefined,
			channelId,
			listings: {
				history: [],
				current: undefined,
				queue: [],
			},
			flags: { isDestroyed: false, loop: { song: false, collection: false }, breakLoop: false },
		};

		this.session = session;

		return session;
	}

	async destroySession(): Promise<void> {
		const session = this.session;
		if (session === undefined) {
			return;
		}

		this.session = undefined;

		session.events.emit("stop");
		session.player.removeAllListeners();
		session.player.stop();
		session.player.pause(false);
		session.player.disconnect();

		clearTimeout(session.disconnectTimeout);
	}

	verifyVoiceState(bot: Discord.Bot, interaction: Discord.Interaction, action: "manage" | "check"): boolean {
		const guild = this.guild;
		if (guild === undefined) {
			return false;
		}

		const voiceState = guild.voiceStates.get(interaction.user.id);
		const userChannelId = voiceState?.channelId;

		if (voiceState === undefined || userChannelId === undefined) {
			const strings = {
				title: localise(this.client, "music.strings.notInVc.title", interaction.locale)(),
				description: {
					toManage: localise(this.client, "music.strings.notInVc.description.toManage", interaction.locale)(),
					toCheck: localise(this.client, "music.strings.notInVc.description.toCheck", interaction.locale)(),
				},
			};

			reply([this.client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: action === "manage" ? strings.description.toManage : strings.description.toCheck,
						color: constants.colors.dullYellow,
					},
				],
			});

			return false;
		}

		const [isOccupied, channelId] = [this.isOccupied, this.channelId];
		if (isOccupied !== undefined && isOccupied && voiceState.channelId !== channelId) {
			const strings = {
				title: localise(this.client, "music.options.play.strings.inDifferentVc.title", interaction.locale)(),
				description: localise(
					this.client,
					"music.options.play.strings.inDifferentVc.description",
					interaction.locale,
				)(),
			};

			reply([this.client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					},
				],
			});

			return false;
		}

		return true;
	}

	verifyCanRequestPlayback(bot: Discord.Bot, interaction: Discord.Interaction): boolean {
		const isVoiceStateVerified = this.verifyVoiceState(bot, interaction, "manage");
		if (isVoiceStateVerified === undefined) {
			return false;
		}

		if (!isVoiceStateVerified) {
			return false;
		}

		const isQueueVacant = this.isQueueVacant;
		if (isQueueVacant !== undefined && !isQueueVacant) {
			const strings = {
				title: localise(this.client, "music.options.play.strings.queueFull.title", interaction.locale)(),
				description: localise(this.client, "music.options.play.strings.queueFull.description", interaction.locale)(),
			};

			reply([this.client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					},
				],
			});

			return false;
		}

		return true;
	}

	verifyCanManagePlayback(bot: Discord.Bot, interaction: Discord.Interaction): boolean {
		const isVoiceStateVerified = this.verifyVoiceState(bot, interaction, "manage");
		if (isVoiceStateVerified === undefined) {
			return false;
		}

		if (!isVoiceStateVerified) {
			return false;
		}

		const session = this.session;
		if (session === undefined) {
			return false;
		}

		const current = session.listings.current;
		if (current === undefined) {
			return true;
		}

		if (!current.managerIds.includes(interaction.user.id)) {
			const strings = {
				title: localise(this.client, "music.strings.cannotChange.title", interaction.locale)(),
				description: localise(this.client, "music.strings.cannotChange.description", interaction.locale)(),
			};

			reply([this.client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					},
				],
			});

			return false;
		}

		return true;
	}

	moveListingToHistory(listing: SongListing): void {
		const session = this.session;
		if (session === undefined) {
			return;
		}

		const isHistoryVacant = this.isHistoryVacant;
		if (isHistoryVacant === undefined) {
			return;
		}

		if (!this.isHistoryVacant) {
			session.listings.history.shift();
		}

		// Adjust the position for being incremented automatically when played next time.
		if (isCollection(listing.content)) {
			listing.content.position--;
		}

		session.listings.history.push(listing);
		session.events.emit("historyUpdate");
	}

	tryClearDisconnectTimeout(): void {
		const session = this.session;
		if (session === undefined) {
			return;
		}

		clearTimeout(session.disconnectTimeout);
	}

	setDisconnectTimeout(): void {
		const session = this.session;
		if (session === undefined) {
			return;
		}

		const timeoutMilliseconds = timeStructToMilliseconds(defaults.MUSIC_DISCONNECT_TIMEOUT);

		session.disconnectTimeout = setTimeout(() => this.destroySession(), timeoutMilliseconds);
	}

	async receiveNewListing(bot: Discord.Bot, listing: SongListing, channelId: bigint): Promise<void> {
		const [guild, session] = [this.guild, this.session ?? (await this.createSession(channelId))];
		if (guild === undefined || session === undefined) {
			return;
		}

		this.tryClearDisconnectTimeout();

		session.listings.queue.push(listing);
		session.events.emit("queueUpdate");

		const voiceStates = guild.voiceStates
			.filter((voiceState) => voiceState.channelId !== undefined)
			.filter((voiceState) => (voiceState.channelId ?? 0n) === channelId)
			.array();
		const managerUserIds = voiceStates.map((voiceState) => voiceState.userId);

		listing.managerIds.push(...managerUserIds);

		// If the player is not connected to a voice channel, or if it is connected
		// to a different voice channel, connect to the new voice channel.
		if (!session.player.connected || session.channelId !== channelId) {
			session.player.connect(channelId.toString(), { deafened: true });
		}

		if (session.listings.current !== undefined) {
			const strings = {
				title: localise(this.client, "music.options.play.strings.queued.title", defaultLocale)(),
				description: localise(
					this.client,
					"music.options.play.strings.queued.description.public",
					defaultLocale,
				)({
					title: listing.content.title,
					user_mention: mention(listing.requestedBy, MentionTypes.User),
				}),
			};

			const embed: Discord.Embed = {
				title: `${constants.symbols.music.queued} ${strings.title}`,
				description: strings.description,
				color: constants.colors.lightGreen,
			};

			await Discord.sendMessage(bot, session.channelId, { embeds: [embed] }).catch(() =>
				this.client.log.warn("Failed to send music feedback message."),
			);
			return;
		}

		await this.advanceQueueAndPlay(bot);
	}

	async advanceQueueAndPlay(bot: Discord.Bot): Promise<void> {
		const [isQueueEmpty, session] = [this.isQueueEmpty, this.session];
		if (isQueueEmpty === undefined || session === undefined) {
			return;
		}

		this.tryClearDisconnectTimeout();

		if (!session.flags.loop.song) {
			if (session.listings.current !== undefined && !isCollection(session.listings.current.content)) {
				this.moveListingToHistory(session.listings.current);
				session.listings.current = undefined;
			}

			if (
				!isQueueEmpty &&
				(session.listings.current === undefined || !isCollection(session.listings.current.content))
			) {
				session.listings.current = session.listings.queue.shift();
				session.events.emit("queueUpdate");
			}
		}

		if (
			session.listings.current !== undefined &&
			session.listings.current.content !== undefined &&
			isCollection(session.listings.current.content)
		) {
			if (isLastInCollection(session.listings.current.content)) {
				if (session.flags.loop.collection) {
					session.listings.current.content.position = 0;
				} else {
					this.moveListingToHistory(session.listings.current);
					session.listings.current = session.listings.queue.shift();
					session.events.emit("queueUpdate");
				}
			} else {
				if (session.flags.loop.song) {
					session.listings.current.content.position--;
				}

				session.listings.current.content.position++;
			}
		}

		if (session.listings.current === undefined) {
			this.setDisconnectTimeout();
			return;
		}

		const currentSong = this.currentSong;
		if (currentSong === undefined) {
			return;
		}

		this.loadSong(bot, currentSong);
	}

	async loadSong(bot: Discord.Bot, song: Song | SongStream): Promise<boolean | undefined> {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		const result = await session.player.node.rest.loadTracks(song.url);

		if (result.loadType === "LOAD_FAILED" || result.loadType === "NO_MATCHES") {
			session.flags.loop.song = false;

			const strings = {
				title: localise(this.client, "music.options.play.strings.failedToLoad.title", defaultLocale)(),
				description: localise(
					this.client,
					"music.options.play.strings.failedToLoad.description",
					defaultLocale,
				)({
					title: song.title,
				}),
			};

			Discord.sendMessage(bot, session.channelId, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.red,
					},
				],
			}).catch(() =>
				this.client.log.warn(
					`Failed to send track load failure to channel with ID ${session.channelId} on guild with ID ${this.guildId}.`,
				),
			);

			await this.advanceQueueAndPlay(bot);

			return false;
		}

		const track = result.tracks.at(0);
		if (track === undefined) {
			return false;
		}

		if (
			session.listings.current !== undefined &&
			session.listings.current.content !== undefined &&
			isExternal(session.listings.current.content)
		) {
			session.listings.current.content.title = track.info.title;
		}

		const onTrackException = async (_: string | null, error: Error) => {
			const session = this.session;
			if (session === undefined) {
				return;
			}

			session.flags.loop.song = false;

			this.client.log.warn(`Failed to play track: ${error}`);

			const strings = {
				title: localise(this.client, "music.options.play.strings.failedToPlay.title", defaultLocale)(),
				description: localise(
					this.client,
					"music.options.play.strings.failedToPlay.description",
					defaultLocale,
				)({
					title: song.title,
				}),
			};

			Discord.sendMessage(bot, session.channelId, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.red,
					},
				],
			}).catch(() =>
				this.client.log.warn(
					`Failed to send track play failure to channel with ID ${session.channelId} on guild with ID ${this.guildId}.`,
				),
			);
		};

		const onTrackEnd = async () => {
			const session = this.session;
			if (session === undefined) {
				return;
			}

			session.player.off("trackException", onTrackException);

			if (session.flags.isDestroyed) {
				this.setDisconnectTimeout();
				return;
			}

			if (session.flags.breakLoop) {
				session.flags.breakLoop = false;
				return;
			}

			this.advanceQueueAndPlay(bot);
		};

		session.player.once("trackException", onTrackException);
		session.player.once("trackEnd", onTrackEnd);

		session.player.play(track.track);

		const emoji = listingTypeToEmoji[song.type];

		const strings = {
			title: localise(
				this.client,
				"music.options.play.strings.nowPlaying.title.nowPlaying",
				defaultLocale,
			)({
				listing_type: localise(this.client, localisationsBySongListingType[song.type], defaultLocale)(),
			}),
			description: {
				nowPlaying: localise(
					this.client,
					"music.options.play.strings.nowPlaying.description.nowPlaying",
					defaultLocale,
				),
				track:
					session.listings.current !== undefined &&
					session.listings.current.content !== undefined &&
					isCollection(session.listings.current.content)
						? localise(
								this.client,
								"music.options.play.strings.nowPlaying.description.track",
								defaultLocale,
						  )({
								index: session.listings.current.content.position + 1,
								number: session.listings.current.content.songs.length,
								title: session.listings.current.content.title,
						  })
						: "",
			},
		};

		if (session.listings.current !== undefined) {
			Discord.sendMessage(bot, session.channelId, {
				embeds: [
					{
						title: `${emoji} ${strings.title}`,
						description: strings.description.nowPlaying({
							song_information: strings.description.track,
							title: song.title,
							url: song.url,
							user_mention: mention(session.listings.current.requestedBy, MentionTypes.User),
						}),
						color: constants.colors.blue,
					},
				],
			}).catch(() =>
				this.client.log.warn(
					`Failed to send now playing message to channel with ID ${session.channelId} on guild with ID ${this.guildId}.`,
				),
			);
		}

		return true;
	}

	async skip(skipCollection: boolean, { by, to }: Partial<PositionControls>): Promise<void> {
		const session = this.session;
		if (session === undefined) {
			return;
		}

		if (
			session.listings.current !== undefined &&
			session.listings.current.content !== undefined &&
			isCollection(session.listings.current.content)
		) {
			if (skipCollection || isLastInCollection(session.listings.current.content)) {
				if (session.flags.loop.collection) {
					session.listings.current.content.position = -1;
				} else {
					this.moveListingToHistory(session.listings.current);
					session.events.emit("historyUpdate");
					session.listings.current = undefined;
				}
			} else {
				if (by !== undefined || to !== undefined) {
					session.flags.loop.song = false;
				}

				if (by !== undefined) {
					session.listings.current.content.position += by - 1;
				}

				if (to !== undefined) {
					session.listings.current.content.position = to - 2;
				}
			}
		}

		const listingsToMoveToHistory = Math.min(by ?? to ?? 0, session.listings.queue.length);

		if (session.listings.current !== undefined) {
			session.listings.history.push(session.listings.current);
			session.events.emit("queueUpdate");
			session.listings.current = undefined;
		}

		for (const _ of Array(listingsToMoveToHistory).keys()) {
			const listing = session.listings.queue.shift();
			if (listing !== undefined) {
				this.moveListingToHistory(listing);
			}
		}

		if (listingsToMoveToHistory !== 0) {
			session.events.emit("queueUpdate");
		}

		await session.player.stop();
	}

	async unskip(bot: Discord.Bot, unskipCollection: boolean, { by, to }: Partial<PositionControls>): Promise<void> {
		const session = this.session;
		if (session === undefined) {
			return;
		}

		if (
			session.listings.current !== undefined &&
			session.listings.current.content !== undefined &&
			isCollection(session.listings.current.content)
		) {
			if (unskipCollection || isFirstInCollection(session.listings.current.content)) {
				if (session.flags.loop.collection) {
					session.listings.current.content.position = -1;
				} else {
					session.listings.current.content.position -= 1;

					session.listings.queue.unshift(session.listings.current);
					const listing = session.listings.history.pop();
					session.events.emit("historyUpdate");
					if (listing !== undefined) {
						session.listings.queue.unshift(listing);
					}
					session.events.emit("queueUpdate");
					session.listings.current = undefined;
				}
			} else {
				if (by !== undefined || to !== undefined) {
					session.flags.loop.song = false;
				}

				if (by !== undefined) {
					session.listings.current.content.position -= by + 1;
				}

				if (to !== undefined) {
					session.listings.current.content.position = to - 2;
				}

				if (by === undefined && to === undefined) {
					session.listings.current.content.position -= 2;
				}
			}
		} else {
			const listingsToMoveToQueue = Math.min(by ?? to ?? 1, session.listings.history.length);

			if (session.listings.current !== undefined) {
				session.listings.queue.unshift(session.listings.current);
				session.events.emit("queueUpdate");
				session.listings.current = undefined;
			}

			for (const _ of Array(listingsToMoveToQueue).keys()) {
				const listing = session.listings.history.pop();
				if (listing !== undefined) {
					session.listings.queue.unshift(listing);
				}
			}

			if (listingsToMoveToQueue !== 0) {
				session.events.emit("queueUpdate");
				session.events.emit("historyUpdate");
			}
		}

		if (session.player.track !== undefined) {
			session.player.stop();
		} else {
			this.advanceQueueAndPlay(bot);
		}
	}

	replay(bot: Discord.Bot, replayCollection: boolean): void {
		const session = this.session;
		if (session === undefined) {
			return;
		}

		if (replayCollection) {
			const previousLoopState = session.flags.loop.collection;
			session.flags.loop.collection = true;
			session.player.once("trackStart", () => {
				session.flags.loop.collection = previousLoopState;
			});
		} else {
			const previousLoopState = session.flags.loop.song;
			session.flags.loop.song = true;
			session.player.once("trackStart", () => {
				session.flags.loop.song = previousLoopState;
			});
		}

		if (
			session.listings.current !== undefined &&
			session.listings.current.content !== undefined &&
			isCollection(session.listings.current.content)
		) {
			if (replayCollection) {
				session.listings.current.content.position = -1;
			} else {
				session.listings.current.content.position--;
			}
		}

		session.flags.breakLoop = true;
		session.player.stop();

		this.advanceQueueAndPlay(bot);
	}

	setVolume(volume: number): void {
		const session = this.session;
		if (session === undefined) {
			return;
		}

		session.player.setVolume(volume);
	}

	pause(): void {
		const session = this.session;
		if (session === undefined) {
			return;
		}

		session.player.pause(true);
	}

	resume(): void {
		const session = this.session;
		if (session === undefined) {
			return;
		}

		session.player.pause(false);
	}

	skipTo(timestampMilliseconds: number): void {
		const session = this.session;
		if (session === undefined) {
			return;
		}

		session.player.seek(timestampMilliseconds);
	}

	remove(index: number): SongListing | undefined {
		const session = this.session;
		if (session === undefined) {
			return undefined;
		}

		const listing = session.listings.queue.splice(index, 1)?.at(0);
		session.events.emit("queueUpdate");

		return listing;
	}

	loop(isCollection: boolean): boolean | undefined {
		const session = this.session;
		if (session === undefined) {
			return;
		}

		if (isCollection) {
			session.flags.loop.collection = !session.flags.loop.collection;
			return session.flags.loop.collection;
		} else {
			session.flags.loop.song = !session.flags.loop.song;
			return session.flags.loop.song;
		}
	}
}

function isCollection(object: Song | SongStream | SongCollection): object is SongCollection {
	return object.type === "collection";
}

function isExternal(object: Song | SongStream | SongCollection): object is SongStream {
	return object.type === "file";
}

function isFirstInCollection(collection: SongCollection): boolean {
	return collection.position === 0;
}

function isLastInCollection(collection: SongCollection): boolean {
	return collection.position === collection.songs.length - 1;
}

const localisationsBySongListingType = {
	song: "music.options.play.strings.nowPlaying.title.type.song",
	collection: "music.options.play.strings.nowPlaying.title.type.songCollection",
	file: "music.options.play.strings.nowPlaying.title.type.external",
} satisfies Record<SongListingType, string>;

export { isCollection, MusicService };
