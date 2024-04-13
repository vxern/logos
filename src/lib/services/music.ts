import { EventEmitter } from "node:events";
import { mention } from "logos:core/formatting";
import { Client } from "logos/client";
import { Collector } from "logos/collectors";
import { Guild } from "logos/database/guild";
import { LocalService } from "logos/services/service";
import * as shoukaku from "shoukaku";

type PlaybackActionType = "manage" | "check";
class MusicService extends LocalService {
	#session?: MusicSession;

	readonly #_voiceStateUpdates: Collector<"voiceStateUpdate">;
	#_managerDisconnects!: (name: string, count: number) => void;
	#_managerConnectionRestores!: (name: string, reconnected: boolean) => void;

	get configuration(): NonNullable<Guild["music"]> {
		return this.guildDocument.music!;
	}

	get hasSession(): boolean {
		return this.#session !== undefined;
	}

	get session(): MusicSession {
		return this.#session!;
	}

	get #_isLogosAlone(): boolean | undefined {
		const botVoiceState = this.guild.voiceStates.get(this.client.bot.id);
		if (botVoiceState?.channelId === undefined) {
			return undefined;
		}

		const voiceStatesForChannel = this.guild.voiceStates
			.array()
			.filter((voiceState) => voiceState.channelId === botVoiceState.channelId);

		return voiceStatesForChannel.length === 1;
	}

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "MusicService", guildId });

		this.#_voiceStateUpdates = new Collector({ guildId });
	}

	async start(): Promise<void> {
		this.#_voiceStateUpdates.onCollect(this.#_handleVoiceStateUpdate.bind(this));

		this.client.lavalinkService.manager.on(
			"disconnect",
			(this.#_managerDisconnects = this.#_handleConnectionLost.bind(this)),
		);
		this.client.lavalinkService.manager.on(
			"ready",
			(this.#_managerConnectionRestores = this.#_handleConnectionRestored.bind(this)),
		);
	}

	async stop(): Promise<void> {
		await this.#_voiceStateUpdates.close();

		this.client.lavalinkService.manager.off("disconnect", this.#_managerDisconnects);
		this.client.lavalinkService.manager.off("ready", this.#_managerConnectionRestores);

		await this.destroySession();
	}

	async createSession({ channelId }: { channelId: bigint }): Promise<MusicSession> {
		const player = await this.client.lavalinkService.manager.joinVoiceChannel({
			shardId: this.guild.shardId,
			guildId: this.guildIdString,
			channelId: channelId.toString(),
			deaf: true,
		});

		// Shoukaku does not remove the current track by default, which means we have to override
		// these methods and add that functionality ourselves, given that the value of `track` is
		// how we check whether the player is playing something or not.
		const { stopTrack, onPlayerEvent } = player;
		player.stopTrack = async () => {
			await stopTrack.call(player);
			player.track = null;
		};
		player.onPlayerEvent = (json) => {
			onPlayerEvent.call(player, json);
			if (json.type === "TrackEndEvent") {
				player.track = null;
			}
		};

		await player.setGlobalVolume(this.configuration.implicitVolume);

		this.#session = new MusicSession({ service: this, player, channelId, oldSession: this.#session });

		return this.#session;
	}

	async destroySession(): Promise<void> {
		await this.#session?.dispose();
		this.#session = undefined;
	}

	async receiveListing(listing: SongListing, { channelId }: { channelId: bigint }): Promise<void> {
		let session: MusicSession;
		if (this.hasSession) {
			session = this.session;
		} else {
			session = await this.createSession({ channelId });
		}

		session.receiveListing({ listing });

		if (session.hasCurrent) {
			const locale = this.guildLocale;

			const strings = {
				title: this.client.localise("music.options.play.strings.queued.title", locale)(),
				description: this.client.localise(
					"music.options.play.strings.queued.description.public",
					locale,
				)({
					title: listing.queueable.title,
					user_mention: mention(listing.userId, { type: "user" }),
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

		await session.playNext();
	}

	async #_handleVoiceStateUpdate(_: Discord.VoiceState): Promise<void> {
		if (this.#_isLogosAlone === true) {
			await this.#_handleSessionAbandoned();
		}
	}

	async #_handleSessionAbandoned(): Promise<void> {
		const strings = {
			title: this.client.localise("music.options.stop.strings.stopped.title", this.guildLocale)(),
			description: this.client.localise("music.options.stop.strings.stopped.description", this.guildLocale)(),
		};

		await this.client.bot.helpers
			.sendMessage(this.session.channelId, {
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

	#_handleConnectionLost(_: string, __: number): void {
		this.client.bot.gateway
			.leaveVoiceChannel(this.guildId)
			.catch(() => this.log.warn("Failed to leave voice channel."));

		if (!this.hasSession) {
			return;
		}

		if (this.session.flags.isDisconnected) {
			return;
		}

		const guildLocale = this.guildLocale;

		const strings = {
			title: this.client.localise("music.strings.outage.halted.title", guildLocale)(),
			description: {
				outage: this.client.localise("music.strings.outage.halted.description.outage", guildLocale)(),
				noLoss: this.client.localise("music.strings.outage.halted.description.noLoss", guildLocale)(),
			},
		};

		this.client.bot.rest
			.sendMessage(this.session.channelId, {
				embeds: [
					{
						title: strings.title,
						description: `${strings.description.outage}\n\n${strings.description.noLoss}`,
						color: constants.colours.death,
					},
				],
			})
			.catch(() => this.log.warn("Failed to send audio halted message."));

		this.session.player.removeAllListeners();
		this.session.flags.isDisconnected = true;
		this.session.restoreAt = this.session.restoreAt + (Date.now() - this.session.startedAt);
	}

	async #_handleConnectionRestored(_: string, __: boolean): Promise<void> {
		if (!this.hasSession) {
			return;
		}

		if (!this.session.flags.isDisconnected) {
			return;
		}

		const oldSession = this.session;
		oldSession.flags.isDisconnected = false;

		await this.destroySession();
		await this.createSession({ channelId: oldSession.channelId });

		// TODO(vxern): Create a method to plug in a new player into an old session.
		// @ts-ignore: For now...
		this.session = { ...oldSession, player: this.session.player };

		await this.session.play({
			playable: this.session.playable,
			restore: { paused: oldSession.player.paused, volume: oldSession.player.volume },
		});

		const guildLocale = this.guildLocale;

		const strings = {
			title: this.client.localise("music.strings.outage.restored.title", guildLocale)(),
			description: this.client.localise("music.strings.outage.restored.description", guildLocale)(),
		};

		this.client.bot.rest
			.sendMessage(this.session.channelId, {
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

	#_canPerformAction(interaction: Logos.Interaction, { action }: { action: PlaybackActionType }): boolean {
		const locale = interaction.locale;

		if (this.#session?.flags.isDisconnected) {
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

		const userChannelId = this.guild.voiceStates.get(interaction.user.id)?.channelId;
		if (userChannelId === undefined) {
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

		if (this.hasSession && userChannelId !== this.session.channelId) {
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

	canCheckPlayback(interaction: Logos.Interaction) {
		return this.#_canPerformAction(interaction, { action: "check" });
	}

	canManagePlayback(interaction: Logos.Interaction) {
		return this.#_canPerformAction(interaction, { action: "manage" });
	}

	canRequestPlayback(interaction: Logos.Interaction): boolean {
		if (!this.hasSession) {
			return true;
		}

		const locale = interaction.locale;

		if (this.session.listings.queue.isFull) {
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
}

class ListingQueue {
	readonly #_listings: SongListing[];
	readonly #_limit: number;
	readonly #_discardOnPassedLimit: boolean;

	get listings(): SongListing[] {
		return structuredClone(this.#_listings);
	}

	get count(): number {
		return this.#_listings.length;
	}

	get isFull(): boolean {
		return this.#_listings.length >= this.#_limit;
	}

	get isEmpty(): boolean {
		return this.#_listings.length === 0;
	}

	constructor({ limit, discardOnPassedLimit }: { limit: number; discardOnPassedLimit: boolean }) {
		this.#_listings = [];
		this.#_limit = limit;
		this.#_discardOnPassedLimit = discardOnPassedLimit;
	}

	addOld(listing: SongListing): void {
		if (this.isFull) {
			if (!this.#_discardOnPassedLimit) {
				// TODO(vxern): Handle refusal to add to queue.
				return;
			}

			this.#_listings.pop();
		}

		this.#_listings.unshift(listing);

		// REMINDER(vxern): Emit an event.
	}

	addNew(listing: SongListing): void {
		if (this.isFull) {
			if (!this.#_discardOnPassedLimit) {
				// TODO(vxern): Handle refusal to add to queue.
				return;
			}

			this.#_listings.shift();
		}

		this.#_listings.push(listing);

		// REMINDER(vxern): Emit an event.
	}

	removeOldest(): SongListing {
		// REMINDER(vxern): Emit an event.

		return this.#_listings.shift()!;
	}

	removeNewest(): SongListing {
		// REMINDER(vxern): Emit an event.

		return this.#_listings.pop()!;
	}

	removeAt(index: number): SongListing | undefined {
		const listing = this.#_listings.splice(index, 1)?.at(0);

		// REMINDER(vxern): Emit an event.

		return listing;
	}
}

class ListingManager {
	readonly history: ListingQueue;
	readonly queue: ListingQueue;

	#current?: SongListing;

	get hasCurrent(): boolean {
		return this.#current !== undefined;
	}

	get current(): SongListing {
		return this.#current!;
	}

	constructor() {
		this.history = new ListingQueue({ limit: constants.MAXIMUM_HISTORY_ENTRIES, discardOnPassedLimit: true });
		this.queue = new ListingQueue({ limit: constants.MAXIMUM_QUEUE_ENTRIES, discardOnPassedLimit: false });
	}

	moveCurrentToHistory(): void {
		// TODO(vxern): This is bad, and it shouldn't be necessary here.
		// Adjust the position for being incremented automatically when played next time.
		if (this.current.queueable instanceof SongCollection) {
			this.current.queueable.position -= 1;
		}

		this.#current!.queueable.reset();

		this.history.addNew(this.#current!);
		this.#current = undefined;
	}

	moveCurrentToQueue(): void {
		this.#current!.queueable.reset();

		this.queue.addOld(this.#current!);
		this.#current = undefined;
	}

	takeCurrentFromQueue(): void {
		this.#current = this.queue.removeOldest();
	}

	moveFromQueueToHistory({ count }: { count: number }): void {
		for (const _ of Array(count).keys()) {
			this.history.addNew(this.queue.removeOldest());
		}

		// REMINDER(vxern): Emit event.
	}

	moveFromHistoryToQueue({ count }: { count: number }): void {
		for (const _ of Array(count).keys()) {
			this.queue.addOld(this.history.removeNewest());
		}

		// REMINDER(vxern): Emit event.
	}
}

// TODO(vxern): Set up listeners to automatically respond to queue events.
type QueueableMode = "song-collection" | "playable";
class MusicSession {
	readonly events: EventEmitter;
	readonly service: MusicService;
	readonly player: shoukaku.Player;
	readonly channelId: bigint;
	readonly listings: ListingManager;
	readonly flags: {
		isDisconnected: boolean;
		isDestroyed: boolean;
		breakLoop: boolean;
	};

	startedAt: number;
	restoreAt: number;

	get hasCurrent(): boolean {
		return this.listings.hasCurrent;
	}

	get current(): SongListing {
		return this.listings.current;
	}

	get queueable(): Queueable {
		return this.current.queueable;
	}

	get playable(): Playable {
		return this.queueable.playable;
	}

	get playingTimeMilliseconds(): number {
		return Date.now() - this.player.position;
	}

	constructor({
		service,
		player,
		channelId,
		oldSession,
	}: { service: MusicService; player: shoukaku.Player; channelId: bigint; oldSession?: MusicSession }) {
		this.events = oldSession?.events ?? new EventEmitter().setMaxListeners(0);
		this.service = service;
		this.player = player;
		this.channelId = channelId;
		this.listings = new ListingManager();
		this.flags = {
			isDisconnected: false,
			isDestroyed: false,
			breakLoop: false,
		};
		this.startedAt = 0;
		this.restoreAt = 0;
	}

	receiveListing({ listing }: { listing: SongListing }): void {
		this.listings.queue.addNew(listing);
	}

	// TODO(vxern): Put this on the song collection.
	#_advanceSongCollection({ queueable }: { queueable: SongCollection }): void {
		if (!queueable.isLastInCollection) {
			if (queueable.playable.isLooping) {
				queueable.position -= 1;
			} else {
				queueable.position += 1;
			}
			return;
		}

		queueable.position = 0;

		if (!queueable.isLooping) {
			this.listings.moveCurrentToHistory();
		}
	}

	#_advancePlayable(): void {
		this.listings.moveCurrentToHistory();
	}

	async advanceQueueAndPlayNext(): Promise<void> {
		// There could be no current queueable in the case of the current song elapsing, or in the case of
		// it having been removed through some other action, for example during a skip/unskip action.
		//
		// If it is indeed the situation that there is no current queueable, we just ignore it and carry on
		// as normal, attempting to play the next queueable.
		if (!this.hasCurrent) {
			await this.playNext();
			return;
		}

		if (this.playable.isLooping) {
			await this.play(this.playable);
			return;
		}

		if (this.queueable instanceof SongCollection) {
			this.#_advanceSongCollection({ queueable: this.queueable });
			await this.play(this.playable);
			return;
		}

		this.#_advancePlayable();
		await this.playNext();
	}

	async playNext(): Promise<void> {
		if (this.listings.queue.isEmpty) {
			return;
		}

		this.listings.takeCurrentFromQueue();

		await this.play(this.playable);
	}

	async setPaused(value: boolean): Promise<void> {
		await this.player.setPaused(value);
	}

	async setVolume(volume: number): Promise<void> {
		await this.player.setGlobalVolume(volume);
	}

	setLoop(value: boolean, { mode }: { mode: QueueableMode }): void {
		switch (mode) {
			case "song-collection": {
				this.queueable.isLooping = value;
				break;
			}
			case "playable": {
				this.playable.isLooping = value;
				break;
			}
		}
	}

	#_skipSongInSongCollection({
		queueable,
		controls,
	}: { queueable: SongCollection; controls: Partial<PositionControls> }): void {
		this.playable.isLooping = false;

		if (controls.by !== undefined) {
			queueable.position += controls.by - 1;
		}

		if (controls.to !== undefined) {
			queueable.position = controls.to - 2;
		}
	}

	#_skipSongCollection(): void {
		this.listings.moveCurrentToHistory();
	}

	#_skipPlayable({ controls }: { controls: Partial<PositionControls> }): void {
		this.listings.moveCurrentToHistory();

		const count = controls.by ?? controls.to ?? 0;
		const listingsToMoveToHistory = Math.min(count, this.listings.queue.count);
		this.listings.moveFromQueueToHistory({ count: listingsToMoveToHistory });
	}

	async skip({ mode, controls }: { mode: QueueableMode; controls: Partial<PositionControls> }): Promise<void> {
		if (this.queueable instanceof SongCollection) {
			if (mode === "song-collection" || this.queueable.isLastInCollection) {
				this.#_skipSongCollection();
			} else {
				this.#_skipSongInSongCollection({ queueable: this.queueable, controls });
			}
		} else {
			this.#_skipPlayable({ controls });
		}

		await this.player.stopTrack();
	}

	#_unskipSongCollection({ queueable }: { queueable: SongCollection }): void {
		queueable.position -= 1;

		this.listings.moveCurrentToQueue();
		this.listings.moveFromHistoryToQueue({ count: 1 });
	}

	#_unskipSongInSongColletion({
		queueable,
		controls,
	}: { queueable: SongCollection; controls: Partial<PositionControls> }): void {
		this.playable.isLooping = false;

		if (controls.by !== undefined) {
			queueable.position -= controls.by + 1;
		}

		if (controls.to !== undefined) {
			queueable.position = controls.to - 2;
		}

		if (controls.by === undefined && controls.to === undefined) {
			queueable.position -= 2;
		}
	}

	#_unskipPlayable({ controls }: { controls: Partial<PositionControls> }): void {
		if (this.hasCurrent) {
			this.listings.moveCurrentToQueue();
		}

		const count = controls.by ?? controls.to ?? 1;
		const listingsToMoveToQueue = Math.min(count, this.listings.history.count);
		this.listings.moveFromHistoryToQueue({ count: listingsToMoveToQueue });
	}

	async unskip({ mode, controls }: { mode: QueueableMode; controls: Partial<PositionControls> }): Promise<void> {
		if (this.hasCurrent && this.queueable instanceof SongCollection) {
			if (mode === "song-collection" || this.queueable.isFirstInCollection) {
				this.#_unskipSongCollection({ queueable: this.queueable });
			} else {
				this.#_unskipSongInSongColletion({ queueable: this.queueable, controls });
			}
		} else {
			this.#_unskipPlayable({ controls });
		}

		if (this.player.track !== null) {
			await this.player.stopTrack();
			return;
		}

		await this.advanceQueueAndPlayNext();
	}

	#_replaySongCollection(): void {
		const queueable = this.queueable;
		if (!(queueable instanceof SongCollection)) {
			return;
		}

		const previousLoopState = queueable.isLooping;
		queueable.isLooping = true;
		this.player.once("start", () => (queueable.isLooping = previousLoopState));

		queueable.position = -1;
	}

	#_replayPlayable(): void {
		const playable = this.playable;

		const previousLoopState = playable.isLooping;
		playable.isLooping = true;
		this.player.once("start", () => (playable.isLooping = previousLoopState));
	}

	async replay({ mode }: { mode: QueueableMode }): Promise<void> {
		switch (mode) {
			case "song-collection": {
				this.#_replaySongCollection();
				break;
			}
			case "playable": {
				this.#_replayPlayable();
				break;
			}
		}

		this.flags.breakLoop = true;
		this.restoreAt = 0;
		await this.player.stopTrack();
		await this.advanceQueueAndPlayNext();
	}

	async skipTo({ timestamp }: { timestamp: number }): Promise<void> {
		this.restoreAt = timestamp;
		await this.player.seekTo(timestamp);
	}

	// TODO(vxern): Refactor this.
	async play({
		playable,
		restore,
	}: { playable: Playable; restore?: { paused: boolean; volume: number } }): Promise<boolean | undefined> {
		const result = await this.player.node.rest.resolve(`ytsearch:${playable.url}`);

		if (result === undefined || result.loadType === "error" || result.loadType === "empty") {
			this.playable.isLooping = false;

			const guildLocale = this.service.guildLocale;
			const strings = {
				title: this.service.client.localise("music.options.play.strings.failedToLoad.title", guildLocale)(),
				description: this.service.client.localise(
					"music.options.play.strings.failedToLoad.description",
					guildLocale,
				)({
					title: playable.title,
				}),
			};

			this.service.client.bot.rest
				.sendMessage(this.channelId, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colours.failure,
						},
					],
				})
				.catch(() =>
					this.service.log.warn(
						`Failed to send track load failure to ${this.service.client.diagnostics.channel(
							this.channelId,
						)} on ${this.service.client.diagnostics.guild(this.service.guildId)}.`,
					),
				);

			await this.advanceQueueAndPlayNext();

			return false;
		}

		let track: shoukaku.Track | undefined;
		if (result.loadType === "search") {
			track = result.data.at(0);
		}
		if (track === undefined) {
			return false;
		}

		if (this.queueable instanceof AudioStream) {
			this.queueable.title = track.info.title;
		}

		this.player.once("exception", async (reason) => {
			this.playable.isLooping = false;

			this.service.log.warn(`Failed to play track: ${reason.exception}`);

			const guildLocale = this.service.guildLocale;
			const strings = {
				title: this.service.client.localise("music.options.play.strings.failedToPlay.title", guildLocale)(),
				description: this.service.client.localise(
					"music.options.play.strings.failedToPlay.description",
					guildLocale,
				)({
					title: playable.title,
				}),
			};

			this.service.client.bot.rest
				.sendMessage(this.channelId, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colours.failure,
						},
					],
				})
				.catch(() =>
					this.service.log.warn(
						`Failed to send track play failure to ${this.service.client.diagnostics.channel(
							this.channelId,
						)} on ${this.service.client.diagnostics.guild(this.service.guildId)}.`,
					),
				);
		});

		this.player.once("end", async () => {
			this.player.removeAllListeners("exception");

			if (this.flags.isDestroyed) {
				return;
			}

			if (this.flags.breakLoop) {
				this.flags.breakLoop = false;
				return;
			}

			this.restoreAt = 0;

			await this.advanceQueueAndPlayNext();
		});

		this.player.once("start", async () => {
			const now = Date.now();
			this.startedAt = now;

			if (this.restoreAt !== 0) {
				await this.player.seekTo(this.restoreAt);
			}

			if (restore !== undefined) {
				await this.player.setPaused(restore.paused);
			}
		});

		if (restore !== undefined) {
			await this.player.setGlobalVolume(restore.volume);
			await this.player.playTrack({ track: track.encoded });
			return;
		}

		await this.player.playTrack({ track: track.encoded });

		const guildLocale = this.service.guildLocale;
		const strings = {
			title: this.service.client.localise(
				"music.options.play.strings.nowPlaying.title.nowPlaying",
				guildLocale,
			)({
				listing_type: this.service.client.localise(
					(() => {
						const queueable = this.queueable;
						switch (true) {
							case queueable instanceof Song: {
								return "music.options.play.strings.nowPlaying.title.type.song";
							}
							case queueable instanceof AudioStream: {
								return "music.options.play.strings.nowPlaying.title.type.stream";
							}
							case queueable instanceof SongCollection: {
								return "music.options.play.strings.nowPlaying.title.type.songCollection";
							}
							default:
								return constants.special.missingString;
						}
					})(),
					guildLocale,
				)(),
			}),
			description: {
				nowPlaying: this.service.client.localise(
					"music.options.play.strings.nowPlaying.description.nowPlaying",
					guildLocale,
				),
				track:
					this.queueable instanceof SongCollection
						? this.service.client.localise(
								"music.options.play.strings.nowPlaying.description.track",
								guildLocale,
						  )({
								index: this.queueable.position + 1,
								number: this.queueable.songs.length,
								title: this.queueable.title,
						  })
						: "",
			},
		};

		this.service.client.bot.rest
			.sendMessage(this.channelId, {
				embeds: [
					{
						title: `${this.queueable.emoji} ${strings.title}`,
						description: strings.description.nowPlaying({
							song_information: strings.description.track,
							title: playable.title,
							url: playable.url,
							user_mention: mention(this.current.userId, { type: "user" }),
						}),
						color: constants.colours.notice,
					},
				],
			})
			.catch(() =>
				this.service.log.warn(
					`Failed to send now playing message to ${this.service.client.diagnostics.channel(
						this.channelId,
					)} on ${this.service.client.diagnostics.guild(this.service.guildId)}.`,
				),
			);

		return true;
	}

	async dispose(): Promise<void> {
		// REMINDER(vxern): Emit stop event.
		await this.player.destroy();
	}
}

interface PositionControls {
	readonly by: number;
	readonly to: number;
}

abstract class Queueable {
	title: string;
	readonly url: string;
	readonly emoji: string;
	isLooping: boolean;

	abstract get playable(): Playable;

	constructor({ title, url, emoji }: { title: string; url: string; emoji: string }) {
		this.title = title;
		this.url = url;
		this.emoji = emoji;
		this.isLooping = false;
	}

	reset(): void {
		this.isLooping = false;
	}
}

abstract class Playable extends Queueable {
	get playable(): Playable {
		return this;
	}
}

/** Represents a musical piece, playable singly by the music controller. */
class Song extends Playable {
	constructor({ title, url }: { title: string; url: string }) {
		super({ title, url, emoji: constants.emojis.music.song });
	}
}

/** Represents a musical piece in stream format. */
class AudioStream extends Playable {
	constructor({ title, url }: { title: string; url: string }) {
		super({ title, url, emoji: constants.emojis.music.stream });
	}
}

/**
 * Represents a collection of {@link Song}s.
 *
 * Collections occupy a single position in a queue whilst containing multiple,
 * playable songs that would each normally occupy a single place of their own
 * in the queue.
 */
class SongCollection extends Queueable {
	/** The songs in this collection. */
	readonly songs: Song[];
	/** The index of the song that is currently playing. */
	position: number;

	get playable(): Playable {
		return this.songs[this.position]!;
	}

	get isFirstInCollection(): boolean {
		return this.position === 0;
	}

	get isLastInCollection(): boolean {
		return this.position === this.songs.length - 1;
	}

	constructor({ title, url, songs }: { title: string; url: string; songs: Song[] }) {
		super({ title, url, emoji: constants.emojis.music.collection });

		this.songs = songs;
		this.position = 0;
	}

	reset(): void {
		super.reset();

		for (const playable of this.songs) {
			playable.reset();
		}

		this.position = 0;
	}
}

/**
 * Represents a playable object in the form of a song or a collection of songs
 * that contains key information about the listing.
 */
class SongListing {
	readonly queueable: Queueable;
	readonly userId: bigint;
	readonly source?: string;

	constructor({ queueable, userId }: { queueable: Queueable; userId: bigint }) {
		this.queueable = queueable;
		this.userId = userId;
	}
}

export { MusicService, Song, SongCollection, AudioStream, SongListing };
