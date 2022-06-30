import { Player } from 'https://deno.land/x/lavadeno@3.2.2/mod.ts';
import {
	ApplicationCommandInteraction,
	EmbedPayload,
	Guild,
	GuildTextChannel,
	Interaction,
	VoiceChannel,
	VoiceState,
} from '../../../deps.ts';
import { Client } from '../../client.ts';
import configuration from '../../configuration.ts';
import { Controller } from '../controller.ts';
import { Song } from './data/song.ts';
import { SongListing } from './data/song-listing.ts';
import { SongCollection } from './data/song-collection.ts';
import { bold, mention, MentionType } from '../../formatting.ts';
import { getVoiceState } from '../../utils.ts';

const defaultVolume = 100;

class MusicController extends Controller {
	/** The audio player associated with this controller. */
	private player: Player;

	/** The voice channel the music is being played in. */
	private voiceChannel!: VoiceChannel;
	/** The text channel associated with the playback. */
	private textChannel!: GuildTextChannel;

	/** List of songs which have already been played. */
	history: SongListing[] = [];
	/** The current song being played. */
	current?: SongListing;
	/** List of songs which are due to be played. */
	queue: SongListing[] = [];

	/** The volume at which the song is being played. */
	volume = defaultVolume;

	/**
	 * Indicates whether the current song is to be played again once it ends.
	 */
	private isLoop = false;

	private disconnectTimeoutID: number | undefined = undefined;

	private breakPreviousLoop = false;

	/** Constructs a {@link MusicController}. */
	constructor(client: Client, guild: Guild) {
		super(guild);

		this.player = client.node.createPlayer(BigInt(this.guild.id));
	}

	/** Gets the current song from the current listing. */
	get currentSong(): Song | undefined {
		if (!this.current) return undefined;

		if (this.current.type === 'SONG') {
			return <Song> this.current.content;
		}

		const collection = <SongCollection> this.current.content;

		return collection.songs[collection.position];
	}

	/** Checks whether the queue holds fewer items than the limit. */
	get canPushToQueue(): boolean {
		return this.queue.length < configuration.music.maxima.songs.queue;
	}

	get isOccupied(): boolean {
		return !!this.player.playingSince;
	}

	/** Indicates whether the controller is paused or not. */
	get isPaused(): boolean {
		return this.player.paused;
	}

	/** Checks the user's voice state, ensuring it is valid for playing music. */
	async verifyMemberVoiceState(
		interaction: Interaction,
	): Promise<[boolean, VoiceState | undefined]> {
		const voiceState = await getVoiceState(interaction.member!);

		// The user is not in a voice channel.
		if (!voiceState || !voiceState.channel) {
			interaction.respond({
				ephemeral: true,
				embeds: [
					{
						title: 'You are not in a voice channel',
						description: 'To play music, you must be in a voice channel.',
						color: configuration.interactions.responses.colors.red,
					},
				],
			});
			return [false, voiceState];
		}

		if (this.isOccupied && this.voiceChannel.id !== voiceState.channel.id) {
			interaction.respond({
				ephemeral: true,
				embeds: [{
					title: 'The bot is playing music in another voice channel',
					description:
						'Join the channel the bot is already playing music in, or wait for the bot to free up.',
					color: configuration.interactions.responses.colors.red,
				}],
			});
			return [false, voiceState];
		}

		return [true, voiceState];
	}

	/**
	 * Checks if the user can play music by verifying several factors, such as
	 * whether or not the user is in a voice channel, and if they have provided
	 * the correct arguments.
	 *
	 * @param interaction - The command interaction.
	 * @returns A tuple with the first item indicating whether the user can play
	 * music, and the second being the user's voice state.
	 */
	async verifyCanPlay(
		interaction: ApplicationCommandInteraction,
	): Promise<[boolean, VoiceState | undefined]> {
		const [canPlay, voiceState] = await this.verifyMemberVoiceState(
			interaction,
		);

		if (!canPlay) return [false, voiceState];

		// No arguments provided.
		if (!interaction.data.options[0]?.options) {
			interaction.respond({
				ephemeral: true,
				embeds: [{
					title: 'You must provide the song\'s title or URL',
					description: `To find a song, ${
						interaction.client.user!.username
					} needs to know its title or a path to it. Please provide the song's title or a link to it.`,
					color: configuration.interactions.responses.colors.red,
				}],
			});
			return [false, voiceState];
		}

		// More than one argument provided, when only one is accepted by the command.
		if (interaction.data.options[0]?.options.length !== 1) {
			interaction.respond({
				ephemeral: true,
				embeds: [{
					title: 'You may only provide one piece of information about a song',
					description: `${
						interaction.client.user!.username
					} uses only one piece of information to find a song; either its title or the link to it. Multiple pieces of information are redundant, and possibly disparate.`,
					color: configuration.interactions.responses.colors.red,
				}],
			});
			return [false, voiceState];
		}

		// The user cannot add to the queue due to one reason or another.
		if (!this.canPushToQueue) {
			interaction.respond({
				ephemeral: true,
				embeds: [{
					title: 'The queue is full',
					description:
						'Try removing a song from the song queue, skip the current song to advance the queue immediately, or wait until the current song stops playing.',
					color: configuration.interactions.responses.colors.red,
				}],
			});
			return [false, voiceState];
		}

		return [true, voiceState];
	}

	private moveToHistory(listing: SongListing): void {
		if (this.history.length === configuration.music.maxima.songs.history) {
			this.history.shift();
		}

		if (listing.type === 'SONG_COLLECTION') {
			(<SongCollection> listing.content).position--;
		}

		this.history.push(listing);
	}

	/**
	 * Taking a listing and the voice and text channels associated with the request to play,
	 * queues the listing, and optionally plays it.
	 */
	play(
		{ interaction, listing, channels }: {
			interaction: Interaction | undefined;
			listing: SongListing;
			channels: { voice: VoiceChannel; text: GuildTextChannel };
		},
	): void {
		clearTimeout(this.disconnectTimeoutID);

		this.queue.push(listing);

		// If the player is not connected to a voice channel, or if it is connected
		// to a different voice channel, connect to the new voice channel.
		if (!this.player.connected) {
			this.player.connect(BigInt(channels.voice.id), { deafen: true });
		}

		const method: (data: { embeds: EmbedPayload[] }) => unknown = interaction
			? (data) => interaction.editResponse(data)
			: (data) => this.textChannel!.send(data);

		if (this.isOccupied) {
			method({
				embeds: [{
					title: '👍 Listing queued.',
					description: `Your listing, ${
						bold(listing.content.title)
					}, has been added to the queue.`,
					color: configuration.interactions.responses.colors.green,
				}],
			});
			return;
		}

		this.voiceChannel = channels.voice;
		this.textChannel = channels.text;

		this.advanceQueueAndPlay(interaction);
	}

	private async advanceQueueAndPlay(interaction?: Interaction): Promise<void> {
		clearTimeout(this.disconnectTimeoutID);

		const wasLooped = this.isLoop;

		if (!this.isLoop) {
			if (this.current && this.current?.type === 'SONG') {
				this.moveToHistory(this.current);
				this.current = undefined;
			}

			if (
				this.queue.length !== 0 &&
				(!this.current || this.current?.type !== 'SONG_COLLECTION')
			) {
				this.current = this.queue.shift()!;
			}
		}

		const isSong = this.current?.type === 'SONG';

		if (this.current && this.current?.type === 'SONG_COLLECTION') {
			const collection = <SongCollection> this.current.content;

			if (collection.position !== collection.songs.length - 1) {
				(<SongCollection> this.current.content).position++;
			} else {
				if (this.isLoop) {
					collection.position = 0;
				} else {
					this.moveToHistory(this.current);
					this.current = undefined;
				}
			}
		}

		if (!this.current) {
			this.textChannel.send({
				embeds: [{
					title: '👏 All done!',
					description: 'Can I go home for today?',
					color: configuration.interactions.responses.colors.blue,
				}],
			});

			this.disconnectTimeoutID = setTimeout(
				() => this.player.disconnect(),
				configuration.music.disconnectTimeout,
			);

			return;
		}

		const currentSong = this.currentSong!;

		const tracksResponse = await this.player.node.rest.loadTracks(
			currentSong.url,
		);

		const track = tracksResponse.tracks[0]!.track;

		this.player.once(
			'trackEnd',
			(_track, _reason) => {
				if (this.breakPreviousLoop) {
					this.breakPreviousLoop = false;
					return;
				}

				this.advanceQueueAndPlay();
			},
		);

		this.player.play(track);

		const method: (data: { embeds: EmbedPayload[] }) => unknown = interaction
			? interaction.deferred
				? (data) => interaction.editResponse(data)
				: (data) => interaction.respond(data)
			: (data) => this.textChannel!.send(data);

		const collection = (<SongCollection> this.current?.content);

		method({
			embeds: [{
				title: `${
					isSong
						? configuration.music.symbols.song
						: configuration.music.symbols.collection
				} ${!wasLooped ? 'Playing' : 'Replaying'} song`,
				description: `${!wasLooped ? 'Now playing' : 'Replaying'} ${
					isSong
						? ''
						: `track ${
							bold(`${collection.position + 1}/${collection.songs.length}`)
						} of ${bold(collection.title)}: `
				} [${bold(currentSong.title)}](${currentSong.url}) as requested by ${
					mention(this.current.requestedBy, MentionType.USER)
				}.`,
				color: configuration.interactions.responses.colors.invisible,
			}],
		});
	}

	skip(
		skipCollection: boolean,
		{ by, to }: { by: number | undefined; to: number | undefined },
	): void {
		if (this.current?.type === 'SONG_COLLECTION') {
			const collection = <SongCollection> this.current!.content;

			if (
				skipCollection || collection.position === collection.songs.length - 1
			) {
				this.moveToHistory(this.current!);

				this.current = undefined;
			} else {
				if (by) {
					(<SongCollection> this.current!.content).position += by - 1;
				}

				if (to) {
					(<SongCollection> this.current!.content).position = to! - 2;
				}
			}
		}

		const songsToMoveToHistory = Math.min(by ?? to ?? 0, this.queue.length);

		for (let i = 0; i < songsToMoveToHistory; i++) {
			this.moveToHistory(this.queue.shift()!);
		}

		this.player.stop();
	}

	unskip(
		unskipCollection: boolean,
		{ by, to }: { by: number | undefined; to: number | undefined },
	): void {
		if (this.current?.type === 'SONG_COLLECTION') {
			if (
				unskipCollection ||
				(<SongCollection> this.current!.content).position === 0
			) {
				if (this.current) {
					this.queue.unshift(this.current);
				}

				this.queue.unshift(this.history.pop()!);

				this.current = undefined;
			} else {
				if (by) {
					(<SongCollection> this.current!.content).position -= by + 1;
				}

				if (to) {
					(<SongCollection> this.current!.content).position = to! - 2;
				}

				if (!by && !to) {
					(<SongCollection> this.current!.content).position -= 2;
				}
			}
		}

		const songsToMoveToQueue = Math.min(by ?? to ?? 1, this.history.length);

		for (let i = 0; i < songsToMoveToQueue; i++) {
			this.queue.unshift(this.history.pop()!);
		}

		if (this.player.track) {
			this.player.stop();
		} else {
			this.advanceQueueAndPlay();
		}
	}

	/** Sets the volume of the player. */
	setVolume(volume: number): void {
		this.volume = volume;

		this.player.setVolume(this.volume);
	}

	pause(): void {
		this.player.pause(true);
	}

	unpause(): void {
		this.player.pause(false);
	}

	replay(
		interaction: Interaction,
		replayCollection: boolean,
	): void {
		const previousLoopState = this.isLoop;
		this.isLoop = true;
		this.player.once('trackStart', () => this.isLoop = previousLoopState);

		if (replayCollection) {
			(<SongCollection> this.current!.content).position = -1;
		} else if (this.current?.type === 'SONG_COLLECTION') {
			(<SongCollection> this.current!.content).position--;
		}

		this.breakPreviousLoop = true;
		this.player.stop();
		this.advanceQueueAndPlay(interaction);
	}

	reset(): void {
		this.history = [];
		this.current = undefined;
		this.queue = [];

		this.isLoop = false;

		this.player.stop();
		this.player.disconnect();

		this.setVolume(defaultVolume);
	}
}

export { MusicController };
