import { EventEmitter } from "node:events";
import * as Lavaclient from "lavaclient";
import { getEmojiBySongListingType } from "../../constants/emojis";
import { getLocalisationBySongListingType } from "../../constants/localisations";
import diagnostics from "../../diagnostics";
import { mention } from "../../formatting";
import { Client } from "../client";
import { Song, SongCollection, SongListing, SongStream } from "../commands/music/data/types";
import { Guild, timeStructToMilliseconds } from "../database/guild";
import { LocalService } from "./service";

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

	startedAt: number;
	restoreAt: number;

	flags: {
		isDisconnected: boolean;
		isDestroyed: boolean;
		loop: {
			song: boolean;
			collection: boolean;
		};
		breakLoop: boolean;
	};
}

// TODO(vxern): This needs cleaning up.
class MusicService extends LocalService {
	#session: Session | undefined;

	get configuration(): Guild["music"] {
		return this.guildDocument?.music;
	}

	get channelId(): bigint | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.channelId;
	}

	get events(): EventEmitter | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.events;
	}

	get volume(): number | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.player.volume;
	}

	get history(): SongListing[] | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.history;
	}

	get current(): SongListing | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.current;
	}

	get currentSong(): Song | SongStream | undefined {
		const session = this.#session;
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
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.queue;
	}

	get isQueueVacant(): boolean | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.queue.length < constants.MAXIMUM_QUEUE_ENTRIES;
	}

	get isQueueEmpty(): boolean | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.queue.length === 0;
	}

	get isHistoryVacant(): boolean | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.history.length < constants.MAXIMUM_HISTORY_ENTRIES;
	}

	get isHistoryEmpty(): boolean | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.listings.history.length === 0;
	}

	get isOccupied(): boolean {
		const session = this.#session;
		if (session === undefined) {
			return false;
		}

		return true;
	}

	get isPaused(): boolean | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.player.paused;
	}

	get playingSince(): number | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.player.playingSince;
	}

	get position(): number | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.player.position;
	}

	get length(): number | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		return session.player.trackData?.length;
	}

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "MusicService", guildId });

		this.#session = undefined;
	}

	async start(): Promise<void> {
		this.client.lavalinkService.node.on("disconnect", () => this.handleConnectionLost());
		this.client.lavalinkService.node.on("connect", () => this.handleConnectionRestored());
	}

	async stop(): Promise<void> {
		await this.destroySession();
	}

	async voiceStateUpdate(_: Discord.VoiceState): Promise<void> {
		const [guild, session] = [this.guild, this.#session];
		if (guild === undefined || session === undefined) {
			return;
		}

		const voiceStates = guild.voiceStates.array().filter((voiceState) => voiceState.channelId === session.channelId);
		const hasSessionBeenAbandoned = voiceStates.length === 1 && voiceStates.at(0)?.userId === this.client.bot.id;
		if (hasSessionBeenAbandoned) {
			this.handleSessionAbandoned();
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
						color: constants.colours.blue,
					},
				],
			})
			.catch(() => this.log.warn("Failed to send stopped music message."));

		this.destroySession();
	}

	async createSession(channelId: bigint): Promise<Session | undefined> {
		const [configuration, oldSession] = [this.configuration, this.#session];
		if (configuration === undefined) {
			return undefined;
		}

		const player = this.client.lavalinkService.node.createPlayer(this.guildIdString);

		player.setVolume(configuration.implicitVolume);

		const session = {
			events: oldSession?.events ?? new EventEmitter().setMaxListeners(Number.POSITIVE_INFINITY),
			player,
			disconnectTimeout: undefined,
			channelId,
			listings: {
				history: [],
				current: undefined,
				queue: [],
			},
			startedAt: 0,
			restoreAt: 0,
			flags: {
				isDisconnected: false,
				isDestroyed: false,
				loop: { song: false, collection: false },
				breakLoop: false,
			},
		};

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
		session.player.removeAllListeners();
		await session.player.stop();
		session.player.disconnect();
		session.player.playing = false;
		session.player.connected = false;
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
						color: constants.colours.peach,
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
			this.destroySession();
			return;
		}

		await this.destroySession();
		await this.createSession(oldSession.channelId);

		const newSession = this.#session;
		if (newSession === undefined) {
			return;
		}

		this.#session = { ...oldSession, player: newSession.player };

		newSession.player.connect(newSession.channelId.toString(), { deafened: true });

		this.loadSong(currentSong, { paused: oldSession.player.paused, volume: oldSession.player.volume });

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
						color: constants.colours.lightGreen,
					},
				],
			})
			.catch(() => this.log.warn("Failed to send audio restored message."));
	}

	verifyVoiceState(interaction: Logos.Interaction, action: "manage" | "check"): boolean {
		const locale = interaction.locale;

		const [guild, session] = [this.guild, this.#session];
		if (guild === undefined) {
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

			this.client.reply(interaction, {
				embeds: [
					{
						title: strings.title,
						description: `${strings.description.outage}\n\n${strings.description.backUpSoon}`,
						color: constants.colours.peach,
					},
				],
			});

			return false;
		}

		const voiceState = guild.voiceStates.get(interaction.user.id);
		const userChannelId = voiceState?.channelId;

		if (voiceState === undefined || userChannelId === undefined) {
			const strings = {
				title: this.client.localise("music.strings.notInVc.title", locale)(),
				description: {
					toManage: this.client.localise("music.strings.notInVc.description.toManage", locale)(),
					toCheck: this.client.localise("music.strings.notInVc.description.toCheck", locale)(),
				},
			};

			this.client.reply(interaction, {
				embeds: [
					{
						title: strings.title,
						description: action === "manage" ? strings.description.toManage : strings.description.toCheck,
						color: constants.colours.dullYellow,
					},
				],
			});

			return false;
		}

		const [isOccupied, channelId] = [this.isOccupied, this.channelId];
		if (isOccupied !== undefined && isOccupied && voiceState.channelId !== channelId) {
			const strings = {
				title: this.client.localise("music.options.play.strings.inDifferentVc.title", locale)(),
				description: this.client.localise("music.options.play.strings.inDifferentVc.description", locale)(),
			};

			this.client.reply(interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colours.dullYellow,
					},
				],
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

		const isQueueVacant = this.isQueueVacant;
		if (isQueueVacant !== undefined && !isQueueVacant) {
			const strings = {
				title: this.client.localise("music.options.play.strings.queueFull.title", locale)(),
				description: this.client.localise("music.options.play.strings.queueFull.description", locale)(),
			};

			this.client.reply(interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colours.dullYellow,
					},
				],
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

			this.client.reply(interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colours.dullYellow,
					},
				],
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
		const [guild, session] = [this.guild, this.#session ?? (await this.createSession(channelId))];
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

			const embed: Discord.CamelizedDiscordEmbed = {
				title: `${constants.emojis.music.queued} ${strings.title}`,
				description: strings.description,
				color: constants.colours.lightGreen,
			};

			await this.client.bot.rest
				.sendMessage(session.channelId, { embeds: [embed] })
				.catch(() => this.log.warn("Failed to send music feedback message."));
			return;
		}

		await this.advanceQueueAndPlay();
	}

	async advanceQueueAndPlay(): Promise<void> {
		const [isQueueEmpty, session] = [this.isQueueEmpty, this.#session];
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
					return this.advanceQueueAndPlay();
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

		this.loadSong(currentSong);
	}

	async loadSong(song: Song | SongStream, restore?: { paused: boolean; volume: number }): Promise<boolean | undefined> {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		const result = await session.player.node.rest.loadTracks(song.url);

		if (result.loadType === "LOAD_FAILED" || result.loadType === "NO_MATCHES") {
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
							color: constants.colours.peach,
						},
					],
				})
				.catch(() =>
					this.log.warn(
						`Failed to send track load failure to ${diagnostics.display.channel(
							session.channelId,
						)} on ${diagnostics.display.guild(this.guildId)}.`,
					),
				);

			await this.advanceQueueAndPlay();

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

		session.player.once("trackException", async (_: string | null, error: Error) => {
			const session = this.#session;
			if (session === undefined) {
				return;
			}

			session.flags.loop.song = false;

			this.log.warn(`Failed to play track: ${error}`);

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
							color: constants.colours.peach,
						},
					],
				})
				.catch(() =>
					this.log.warn(
						`Failed to send track play failure to ${diagnostics.display.channel(
							session.channelId,
						)} on ${diagnostics.display.guild(this.guildId)}.`,
					),
				);
		});

		session.player.once("trackEnd", async () => {
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
			this.advanceQueueAndPlay();
		});

		session.player.once("trackStart", async () => {
			const now = Date.now();
			session.startedAt = now;

			if (session.restoreAt !== 0) {
				session.player.seek(session.restoreAt);
			}

			if (restore !== undefined) {
				session.player.pause(restore.paused);
			}
		});

		if (restore !== undefined) {
			session.player.setVolume(restore.volume);
			session.player.play(track.track);
			return;
		}

		session.player.play(track.track);

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
					isCollection(session.listings.current.content)
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
							color: constants.colours.blue,
						},
					],
				})
				.catch(() =>
					this.log.warn(
						`Failed to send now playing message to ${diagnostics.display.channel(
							session.channelId,
						)} on ${diagnostics.display.guild(this.guildId)}.`,
					),
				);
		}

		return true;
	}

	async skip(skipCollection: boolean, { by, to }: Partial<PositionControls>): Promise<void> {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		if (
			session.listings.current !== undefined &&
			session.listings.current.content !== undefined &&
			isCollection(session.listings.current.content)
		) {
			if (skipCollection || isLastInCollection(session.listings.current.content)) {
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

		await session.player.stop();
	}

	async unskip(unskipCollection: boolean, { by, to }: Partial<PositionControls>): Promise<void> {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		if (
			session.listings.current !== undefined &&
			session.listings.current.content !== undefined &&
			isCollection(session.listings.current.content)
		) {
			if (unskipCollection || isFirstInCollection(session.listings.current.content)) {
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
			session.player.stop();
		} else {
			this.advanceQueueAndPlay();
		}
	}

	replay(replayCollection: boolean): void {
		const session = this.#session;
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
			}
		}

		session.flags.breakLoop = true;
		session.restoreAt = 0;
		session.player.stop();

		this.advanceQueueAndPlay();
	}

	setVolume(volume: number): void {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		session.player.setVolume(volume);
	}

	pause(): void {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		session.player.pause(true);
	}

	resume(): void {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		session.player.pause(false);
	}

	async skipTo(timestampMilliseconds: number): Promise<void> {
		const session = this.#session;
		if (session === undefined) {
			return;
		}

		session.restoreAt = timestampMilliseconds;
		await session.player.seek(timestampMilliseconds);
	}

	remove(index: number): SongListing | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		const listing = session.listings.queue.splice(index, 1)?.at(0);
		session.events.emit("queueUpdate");

		return listing;
	}

	loop(isCollection: boolean): boolean | undefined {
		const session = this.#session;
		if (session === undefined) {
			return undefined;
		}

		if (isCollection) {
			session.flags.loop.collection = !session.flags.loop.collection;
			return session.flags.loop.collection;
		}
		session.flags.loop.song = !session.flags.loop.song;
		return session.flags.loop.song;
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

export { isCollection, MusicService };
