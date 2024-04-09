import { EventEmitter } from "node:events";
import { getEmojiBySongListingType } from "logos:constants/emojis";
import { getLocalisationBySongListingType } from "logos:constants/localisations";
import {
	AudioStream,
	Song,
	SongListing,
	isFirstInCollection,
	isLastInCollection,
	isSongCollection,
	isSongStream,
} from "logos:constants/music";
import { mention } from "logos:core/formatting";
import { Client } from "logos/client";
import { Collector } from "logos/collectors";
import { Guild, timeStructToMilliseconds } from "logos/database/guild";
import { LocalService } from "logos/services/service";
import * as shoukaku from "shoukaku";
class MusicService extends LocalService {
	#session: MusicSession | undefined;

	readonly #_voiceStateUpdates: Collector<"voiceStateUpdate">;

	get configuration(): NonNullable<Guild["music"]> {
		return this.guildDocument.music!;
	}

	get channelId(): bigint | undefined {
		return this.#session?.channelId;
	}

	get events(): EventEmitter | undefined {
		return this.#session?.events;
	}

	get current(): SongListing | undefined {
		return this.#session?.listings.current;
	}

	get currentSong(): Song | AudioStream | undefined {
		const current = this.current;
		if (current === undefined) {
			return undefined;
		}

		if (isSongCollection(current.content)) {
			return current.content.songs[current.content.position];
		}

		return current.content;
	}

	get isOccupied(): boolean {
		return this.#session !== undefined;
	}

	get playingSince(): number | undefined {
		const position = this.position;
		if (position === undefined) {
			return undefined;
		}

		return Date.now() - position;
	}

	get position(): number | undefined {
		return this.#session?.player.position;
	}

	get length(): number | undefined {
		return this.#session?.player.data.playerOptions.endTime;
	}

	get session(): MusicSession {
		return this.#session!;
	}

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "MusicService", guildId });

		this.#session = undefined;

		this.#_voiceStateUpdates = new Collector({ guildId });
	}

	async start(): Promise<void> {
		this.#_voiceStateUpdates.onCollect(this.#handleVoiceStateUpdate.bind(this));

		this.client.lavalinkService.manager.on("disconnect", (_, __) => this.handleConnectionLost());
		this.client.lavalinkService.manager.on("ready", (_, __) => this.handleConnectionRestored());
	}

	async stop(): Promise<void> {
		await this.#_voiceStateUpdates.close();

		await this.destroySession();
	}

	async #handleVoiceStateUpdate(_: Discord.VoiceState): Promise<void> {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		const voiceStates = this.guild.voiceStates
			.array()
			.filter((voiceState) => voiceState.channelId === session.channelId);
		const hasSessionBeenAbandoned = voiceStates.length === 1 && voiceStates.at(0)?.userId === this.client.bot.id;
		if (hasSessionBeenAbandoned) {
			await this.handleSessionAbandoned();
		}
	}

	async handleSessionAbandoned(): Promise<void> {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		const strings = {
			title: this.client.localise("music.options.stop.strings.stopped.title", this.guildLocale)(),
			description: this.client.localise("music.options.stop.strings.stopped.description", this.guildLocale)(),
		};

		await this.client.bot.helpers
			.sendMessage(session.channelId, {
				embeds: [
					{
						title: `${constants.emojis.music.stopped} ${strings.title}`,
						description: strings.description,
						color: constants.colours.notice,
					},
				],
			})
			.catch(() => this.log.warn("Failed to send stopped music message."));

		await this.destroySession();
	}

	async createSession(channelId: bigint): Promise<MusicSession | undefined> {
		const oldSession = this.#session;

		const player = await this.client.lavalinkService.manager.joinVoiceChannel({
			shardId: this.guild.shardId,
			guildId: this.guildIdString,
			channelId: channelId.toString(),
			deaf: true,
		});

		await player.setGlobalVolume(this.configuration.implicitVolume);

		const session = new MusicSession({ player, channelId, oldSession });

		this.#session = session;

		return session;
	}

	async destroySession(): Promise<void> {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		this.#session = undefined;

		session.events.emit("stop");
		await session.player.node.manager.leaveVoiceChannel(this.guildIdString);
		await session.player.destroy();

		clearTimeout(session.disconnectTimeout);
	}

	handleConnectionLost(): void {
		this.client.bot.gateway
			.leaveVoiceChannel(this.guildId)
			.catch(() => this.log.warn("Failed to leave voice channel."));

		const session = this.#session;
		if (session === undefined) {
			return;
		}

		if (session.flags.isDisconnected) {
			return;
		}

		const guildLocale = this.guildLocale;

		const now = Date.now();

		const strings = {
			title: this.client.localise("music.strings.outage.halted.title", guildLocale)(),
			description: {
				outage: this.client.localise("music.strings.outage.halted.description.outage", guildLocale)(),
				noLoss: this.client.localise("music.strings.outage.halted.description.noLoss", guildLocale)(),
			},
		};

		this.client.bot.rest
			.sendMessage(session.channelId, {
				embeds: [
					{
						title: strings.title,
						description: `${strings.description.outage}\n\n${strings.description.noLoss}`,
						color: constants.colours.death,
					},
				],
			})
			.catch(() => this.log.warn("Failed to send audio halted message."));

		session.player.removeAllListeners();

		session.flags.isDisconnected = true;

		const currentSong = this.currentSong;
		if (currentSong === undefined) {
			return;
		}

		session.restoreAt = session.restoreAt + (now - session.startedAt);
	}

	async handleConnectionRestored(): Promise<void> {
		const oldSession = this.#session;
		if (oldSession === undefined) {
			return;
		}

		if (!oldSession.flags.isDisconnected) {
			return;
		}

		oldSession.flags.isDisconnected = false;

		const currentSong = this.currentSong;
		if (currentSong === undefined) {
			await this.destroySession();
			return;
		}

		await this.destroySession();
		await this.createSession(oldSession.channelId);

		const newSession = this.#session;
		if (newSession === undefined) {
			return;
		}

		// TODO(vxern): Create a method to plug in a new player into an old session.
		// @ts-ignore: For now...
		this.#session = { ...oldSession, player: newSession.player };

		await this.loadSong(currentSong, { paused: oldSession.player.paused, volume: oldSession.player.volume });

		const guildLocale = this.guildLocale;

		const strings = {
			title: this.client.localise("music.strings.outage.restored.title", guildLocale)(),
			description: this.client.localise("music.strings.outage.restored.description", guildLocale)(),
		};

		this.client.bot.rest
			.sendMessage(newSession.channelId, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colours.success,
					},
				],
			})
			.catch(() => this.log.warn("Failed to send audio restored message."));
	}

	verifyVoiceState(interaction: Logos.Interaction, action: "manage" | "check"): boolean {
		const locale = interaction.locale;

		const session = this.#session;
		if (session === undefined) {
			return false;
		}

		if (session?.flags.isDisconnected) {
			const strings = {
				title: this.client.localise("music.strings.outage.cannotManage.title", locale)(),
				description: {
					outage: this.client.localise("music.strings.outage.cannotManage.description.outage", locale)(),
					backUpSoon: this.client.localise("music.strings.outage.cannotManage.description.backUpSoon", locale)(),
				},
			};

			this.client.unsupported(interaction, {
				title: strings.title,
				description: `${strings.description.outage}\n\n${strings.description.backUpSoon}`,
			});

			return false;
		}

		const voiceState = this.guild.voiceStates.get(interaction.user.id);
		const userChannelId = voiceState?.channelId;

		if (voiceState === undefined || userChannelId === undefined) {
			const strings = {
				title: this.client.localise("music.strings.notInVc.title", locale)(),
				description: {
					toManage: this.client.localise("music.strings.notInVc.description.toManage", locale)(),
					toCheck: this.client.localise("music.strings.notInVc.description.toCheck", locale)(),
				},
			};

			this.client.warning(interaction, {
				title: strings.title,
				description: action === "manage" ? strings.description.toManage : strings.description.toCheck,
			});

			return false;
		}

		const [isOccupied, channelId] = [this.isOccupied, this.channelId];
		if (isOccupied !== undefined && isOccupied && voiceState.channelId !== channelId) {
			const strings = {
				title: this.client.localise("music.options.play.strings.inDifferentVc.title", locale)(),
				description: this.client.localise("music.options.play.strings.inDifferentVc.description", locale)(),
			};

			this.client.warning(interaction, {
				title: strings.title,
				description: strings.description,
			});

			return false;
		}

		return true;
	}

	verifyCanRequestPlayback(interaction: Logos.Interaction): boolean {
		const locale = interaction.locale;

		const isVoiceStateVerified = this.verifyVoiceState(interaction, "manage");
		if (!isVoiceStateVerified) {
			return false;
		}

		if (this.session.isQueueFull) {
			const strings = {
				title: this.client.localise("music.options.play.strings.queueFull.title", locale)(),
				description: this.client.localise("music.options.play.strings.queueFull.description", locale)(),
			};

			this.client.warning(interaction, {
				title: strings.title,
				description: strings.description,
			});

			return false;
		}

		return true;
	}

	verifyCanManagePlayback(interaction: Logos.Interaction): boolean {
		const locale = interaction.locale;

		const isVoiceStateVerified = this.verifyVoiceState(interaction, "manage");
		if (!isVoiceStateVerified) {
			return false;
		}

		const current = this.#session?.listings.current;
		if (current === undefined) {
			return true;
		}

		if (!current.managerIds.includes(interaction.user.id)) {
			const strings = {
				title: this.client.localise("music.strings.cannotChange.title", locale)(),
				description: this.client.localise("music.strings.cannotChange.description", locale)(),
			};

			this.client.pushback(interaction, {
				title: strings.title,
				description: strings.description,
			});

			return false;
		}

		return true;
	}

	moveListingToHistory(listing: SongListing): void {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		if (session.isHistoryFull) {
			session.listings.history.shift();
		}

		// Adjust the position for being incremented automatically when played next time.
		if (isSongCollection(listing.content)) {
			listing.content.position -= 1;
		}

		session.listings.history.push(listing);
		session.events.emit("historyUpdate");
	}

	tryClearDisconnectTimeout(): void {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		clearTimeout(session.disconnectTimeout);
	}

	setDisconnectTimeout(): void {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		const timeoutMilliseconds = timeStructToMilliseconds(constants.defaults.MUSIC_DISCONNECT_TIMEOUT);

		session.disconnectTimeout = setTimeout(() => this.destroySession(), timeoutMilliseconds);
	}

	async receiveNewListing(listing: SongListing, channelId: bigint): Promise<void> {
		const session = this.#session ?? (await this.createSession(channelId));
		if (session === undefined) {
			return;
		}

		this.tryClearDisconnectTimeout();

		session.listings.queue.push(listing);
		session.events.emit("queueUpdate");

		const voiceStates = this.guild.voiceStates
			.filter((voiceState) => voiceState.channelId !== undefined)
			.filter((voiceState) => (voiceState.channelId ?? 0n) === channelId)
			.array();
		const managerUserIds = voiceStates.map((voiceState) => voiceState.userId);

		listing.managerIds.push(...managerUserIds);

		const guildLocale = this.guildLocale;

		if (session.listings.current !== undefined) {
			const strings = {
				title: this.client.localise("music.options.play.strings.queued.title", guildLocale)(),
				description: this.client.localise(
					"music.options.play.strings.queued.description.public",
					guildLocale,
				)({
					title: listing.content.title,
					user_mention: mention(listing.requestedBy, { type: "user" }),
				}),
			};

			await this.client.bot.rest
				.sendMessage(session.channelId, {
					embeds: [
						{
							title: `${constants.emojis.music.queued} ${strings.title}`,
							description: strings.description,
							color: constants.colours.success,
						},
					],
				})
				.catch(() => this.log.warn("Failed to send music feedback message."));

			return;
		}

		await this.advanceQueueAndPlay();
	}

	async advanceQueueAndPlay(): Promise<void> {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		this.tryClearDisconnectTimeout();

		if (!session.flags.loop.song) {
			if (session.listings.current !== undefined && !isSongCollection(session.listings.current.content)) {
				this.moveListingToHistory(session.listings.current);
				session.listings.current = undefined;
			}

			if (
				!session.isQueueEmpty &&
				(session.listings.current === undefined || !isSongCollection(session.listings.current.content))
			) {
				session.listings.current = session.listings.queue.shift();
				session.events.emit("queueUpdate");
			}
		}

		if (
			session.listings.current !== undefined &&
			session.listings.current.content !== undefined &&
			isSongCollection(session.listings.current.content)
		) {
			if (isLastInCollection(session.listings.current.content)) {
				if (session.flags.loop.collection) {
					session.listings.current.content.position = 0;
				} else {
					this.moveListingToHistory(session.listings.current);
					session.listings.current = session.listings.queue.shift();
					session.events.emit("queueUpdate");
					return this.advanceQueueAndPlay();
				}
			} else {
				if (session.flags.loop.song) {
					session.listings.current.content.position -= 1;
				}

				session.listings.current.content.position += 1;
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

		await this.loadSong(currentSong);
	}

	async loadSong(
		song: Song | AudioStream,
		restore?: { paused: boolean; volume: number },
	): Promise<boolean | undefined> {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		const result = await session.player.node.rest.resolve(`ytsearch:${song.url}`);

		if (result === undefined || result.loadType === "error" || result.loadType === "empty") {
			session.flags.loop.song = false;

			const guildLocale = this.guildLocale;
			const strings = {
				title: this.client.localise("music.options.play.strings.failedToLoad.title", guildLocale)(),
				description: this.client.localise(
					"music.options.play.strings.failedToLoad.description",
					guildLocale,
				)({
					title: song.title,
				}),
			};

			this.client.bot.rest
				.sendMessage(session.channelId, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colours.failure,
						},
					],
				})
				.catch(() =>
					this.log.warn(
						`Failed to send track load failure to ${this.client.diagnostics.channel(
							session.channelId,
						)} on ${this.client.diagnostics.guild(this.guildId)}.`,
					),
				);

			await this.advanceQueueAndPlay();

			return false;
		}

		let track: shoukaku.Track | undefined;
		if (result.loadType === "search") {
			track = result.data.at(0);
		}
		if (track === undefined) {
			return false;
		}

		if (
			session.listings.current !== undefined &&
			session.listings.current.content !== undefined &&
			isSongStream(session.listings.current.content)
		) {
			session.listings.current.content.title = track.info.title;
		}

		session.player.once("exception", async (reason) => {
			const session = this.#session;
			if (session === undefined) {
				return;
			}

			session.flags.loop.song = false;

			this.log.warn(`Failed to play track: ${reason.exception}`);

			const guildLocale = this.guildLocale;
			const strings = {
				title: this.client.localise("music.options.play.strings.failedToPlay.title", guildLocale)(),
				description: this.client.localise(
					"music.options.play.strings.failedToPlay.description",
					guildLocale,
				)({
					title: song.title,
				}),
			};

			this.client.bot.rest
				.sendMessage(session.channelId, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colours.failure,
						},
					],
				})
				.catch(() =>
					this.log.warn(
						`Failed to send track play failure to ${this.client.diagnostics.channel(
							session.channelId,
						)} on ${this.client.diagnostics.guild(this.guildId)}.`,
					),
				);
		});

		session.player.once("end", async () => {
			const session = this.#session;
			if (session === undefined) {
				return;
			}

			session.player.removeAllListeners("trackException");

			if (session.flags.isDestroyed) {
				this.setDisconnectTimeout();
				return;
			}

			if (session.flags.breakLoop) {
				session.flags.breakLoop = false;
				return;
			}

			session.restoreAt = 0;

			await this.advanceQueueAndPlay();
		});

		session.player.once("start", async () => {
			const now = Date.now();
			session.startedAt = now;

			if (session.restoreAt !== 0) {
				await session.player.seekTo(session.restoreAt);
			}

			if (restore !== undefined) {
				await session.player.setPaused(restore.paused);
			}
		});

		if (restore !== undefined) {
			await session.player.setGlobalVolume(restore.volume);
			await session.player.playTrack({ track: track.encoded });
			return;
		}

		await session.player.playTrack({ track: track.encoded });

		const emoji = getEmojiBySongListingType(this.current?.content.type ?? song.type);

		const guildLocale = this.guildLocale;
		const strings = {
			title: this.client.localise(
				"music.options.play.strings.nowPlaying.title.nowPlaying",
				guildLocale,
			)({
				listing_type: this.client.localise(
					getLocalisationBySongListingType(this.current?.content.type ?? song.type),
					guildLocale,
				)(),
			}),
			description: {
				nowPlaying: this.client.localise("music.options.play.strings.nowPlaying.description.nowPlaying", guildLocale),
				track:
					session.listings.current !== undefined &&
					session.listings.current.content !== undefined &&
					isSongCollection(session.listings.current.content)
						? this.client.localise(
								"music.options.play.strings.nowPlaying.description.track",
								guildLocale,
						  )({
								index: session.listings.current.content.position + 1,
								number: session.listings.current.content.songs.length,
								title: session.listings.current.content.title,
						  })
						: "",
			},
		};

		if (session.listings.current !== undefined) {
			this.client.bot.rest
				.sendMessage(session.channelId, {
					embeds: [
						{
							title: `${emoji} ${strings.title}`,
							description: strings.description.nowPlaying({
								song_information: strings.description.track,
								title: song.title,
								url: song.url,
								user_mention: mention(session.listings.current.requestedBy, { type: "user" }),
							}),
							color: constants.colours.notice,
						},
					],
				})
				.catch(() =>
					this.log.warn(
						`Failed to send now playing message to ${this.client.diagnostics.channel(
							session.channelId,
						)} on ${this.client.diagnostics.guild(this.guildId)}.`,
					),
				);
		}

		return true;
	}

	async skip(collection: boolean, { by, to }: Partial<PositionControls>): Promise<void> {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		if (
			session.listings.current !== undefined &&
			session.listings.current.content !== undefined &&
			isSongCollection(session.listings.current.content)
		) {
			if (collection || isLastInCollection(session.listings.current.content)) {
				session.flags.loop.collection = false;

				this.moveListingToHistory(session.listings.current);
				session.events.emit("historyUpdate");
				session.listings.current = undefined;
			} else {
				session.flags.loop.song = false;

				if (by !== undefined) {
					session.listings.current.content.position += by - 1;
				}

				if (to !== undefined) {
					session.listings.current.content.position = to - 2;
				}
			}
		} else {
			const listingsToMoveToHistory = Math.min(by ?? to ?? 0, session.listings.queue.length);

			if (session.listings.current !== undefined) {
				session.listings.history.push(session.listings.current);
				session.events.emit("historyUpdate");
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
				session.flags.loop.song = false;
				session.events.emit("queueUpdate");
			}
		}

		await session.player.stopTrack();
	}

	async unskip(collection: boolean, { by, to }: Partial<PositionControls>): Promise<void> {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		if (
			session.listings.current !== undefined &&
			session.listings.current.content !== undefined &&
			isSongCollection(session.listings.current.content)
		) {
			if (collection || isFirstInCollection(session.listings.current.content)) {
				session.flags.loop.collection = false;

				session.listings.current.content.position -= 1;

				session.listings.queue.unshift(session.listings.current);
				const listing = session.listings.history.pop();
				session.events.emit("historyUpdate");
				if (listing !== undefined) {
					session.listings.queue.unshift(listing);
				}
				session.events.emit("queueUpdate");
				session.listings.current = undefined;
			} else {
				session.flags.loop.song = false;

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
			await session.player.stopTrack();
		} else {
			await this.advanceQueueAndPlay();
		}
	}

	async replay(collection: boolean): Promise<void> {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		if (collection) {
			const previousLoopState = session.flags.loop.collection;
			session.flags.loop.collection = true;
			session.player.once("start", () => {
				session.flags.loop.collection = previousLoopState;
			});
		} else {
			const previousLoopState = session.flags.loop.song;
			session.flags.loop.song = true;
			session.player.once("start", () => {
				session.flags.loop.song = previousLoopState;
			});
		}

		if (
			session.listings.current !== undefined &&
			session.listings.current.content !== undefined &&
			isSongCollection(session.listings.current.content)
		) {
			if (collection) {
				session.listings.current.content.position = -1;
			}
		}

		session.flags.breakLoop = true;
		session.restoreAt = 0;
		await session.player.stopTrack();

		await this.advanceQueueAndPlay();
	}

	async skipTo(timestampMilliseconds: number): Promise<void> {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		session.restoreAt = timestampMilliseconds;
		await session.player.seekTo(timestampMilliseconds);
	}

	loop(collection: boolean): boolean | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		if (collection) {
			session.flags.loop.collection = !session.flags.loop.collection;
			return session.flags.loop.collection;
		}

		session.flags.loop.song = !session.flags.loop.song;

		return session.flags.loop.song;
	}
}

class ListingManager {
	readonly history: SongListing[];
	readonly queue: SongListing[];
	current?: SongListing;

	constructor() {
		this.history = [];
		this.queue = [];
	}

	dequeue(index: number): SongListing | undefined {
		const listing = this.queue.splice(index, 1)?.at(0);

		// REMINDER(vxern): session.events.emit("queueUpdate");

		return listing;
	}
}

class MusicSession {
	readonly events: EventEmitter;
	readonly player: shoukaku.Player;
	readonly channelId: bigint;
	readonly listings: ListingManager;
	readonly flags: {
		isDisconnected: boolean;
		isDestroyed: boolean;
		loop: {
			song: boolean;
			collection: boolean;
		};
		breakLoop: boolean;
	};

	disconnectTimeout?: Timer;

	startedAt: number;
	restoreAt: number;

	get isPaused(): boolean {
		return this.player.paused;
	}

	get volume(): number {
		return this.player.volume;
	}

	get isHistoryFull(): boolean {
		return this.history.length >= constants.MAXIMUM_HISTORY_ENTRIES;
	}

	get isHistoryEmpty(): boolean {
		return this.history.length === 0;
	}

	get history(): SongListing[] {
		return this.listings.history;
	}

	get isQueueFull(): boolean {
		return this.queue.length >= constants.MAXIMUM_QUEUE_ENTRIES;
	}

	get isQueueEmpty(): boolean {
		return this.queue.length === 0;
	}

	get queue(): SongListing[] {
		return this.listings.queue;
	}

	constructor({
		player,
		channelId,
		oldSession,
	}: { player: shoukaku.Player; channelId: bigint; oldSession?: MusicSession }) {
		this.events = oldSession?.events ?? new EventEmitter().setMaxListeners(0);
		this.player = player;
		this.channelId = channelId;
		this.listings = new ListingManager();
		this.startedAt = 0;
		this.restoreAt = 0;
		this.flags = {
			isDisconnected: false,
			isDestroyed: false,
			loop: { song: false, collection: false },
			breakLoop: false,
		};
	}

	pause(): void {
		this.player.setPaused(true);
	}

	resume(): void {
		this.player.setPaused(false);
	}

	setVolume(volume: number): void {
		this.player.setGlobalVolume(volume);
	}
}

interface PositionControls {
	readonly by: number;
	readonly to: number;
}

export { MusicService };
