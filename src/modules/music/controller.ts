import { Player } from 'https://deno.land/x/lavadeno@3.2.2/mod.ts';
import {
	EmbedPayload,
	Guild,
	GuildTextChannel,
	Interaction,
	InteractionApplicationCommandData,
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
	volume = 100;

	/**
	 * Indicates whether the current song is to be played again once it ends.
	 */
	private isLoop = false;

	/** Constructs a {@link MusicController}. */
	constructor(client: Client, guild: Guild) {
		super(guild);

		this.player = client.node.createPlayer(BigInt(this.guild.id));

		this.player.on('trackEnd', (_track, _reason) => this.advanceQueueAndPlay());
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
		return !!this.current;
	}

	/** Indicates whether the controller is paused or not. */
	get isPaused(): boolean {
		return this.player.paused;
	}

	/**
	 * Checks if the user can play music by verifying several factors, such as
	 * whether or not the user is in a voice channel, and if they have provided
	 * the correct arguments.
	 *
	 * @param interaction - The interaction.
	 * @returns Whether the user can play music.
	 */
	verifyCanQueueListing(
		interaction: Interaction,
		{
			data,
			voiceState,
		}: { data: InteractionApplicationCommandData; voiceState?: VoiceState },
	): boolean {
		// The user is not in a voice channel.
		if (!voiceState || !voiceState.channel) {
			interaction.respond({
				ephemeral: true,
				embeds: [{
					title: 'You are not in a voice channel',
					description: 'To play music, you must be in a voice channel.',
					color: configuration.interactions.responses.colors.red,
				}],
			});
			return false;
		}

		if (this.player.track && this.voiceChannel.id !== voiceState.channel.id) {
			interaction.respond({
				ephemeral: true,
				embeds: [{
					title: 'The bot is playing music in another voice channel',
					description:
						'Join the channel the bot is already playing music in, or wait for the bot to free up.',
					color: configuration.interactions.responses.colors.red,
				}],
			});
			return false;
		}

		// No arguments provided.
		if (!data.options[0]?.options) {
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
			return false;
		}

		// More than one argument provided, when only one is accepted by the command.
		if (data.options[0]?.options.length !== 1) {
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
			return false;
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
			return false;
		}

		return true;
	}

	private moveToHistory(listing: SongListing): void {
		if (this.history.length === configuration.music.maxima.songs.history) {
			this.history.shift();
		}

		this.history.push(listing);
	}

	/**
	 * Taking a listing and the voice and text channels associated with the request to play,
	 * queues the listing, and optionally plays it.
	 */
	play(
		{ interaction, listing, channels }: {
			interaction: Interaction;
			listing: SongListing;
			channels: { voice: VoiceChannel; text: GuildTextChannel };
		},
	): void {
		this.queue.push(listing);

		// If the player is not connected to a voice channel, or if it is connected
		// to a different voice channel, connect to the new voice channel.
		if (!this.player.connected) {
			this.player.connect(BigInt(channels.voice.id), { deafen: true });
		}

		if (this.isOccupied) {
			interaction.editResponse({
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
		const wasLooped = this.isLoop;

		if (!this.isLoop) {
			if (this.current && this.current?.type === 'SONG') {
				this.moveToHistory(this.current);
				this.current = undefined;
			}

			if (this.queue.length !== 0) {
				this.current = this.queue.shift()!;
			}
		}

		if (this.current && this.current.type !== 'SONG') {
			const collection = <SongCollection> this.current.content;

			if (collection.position !== collection.songs.length - 1) {
				(<SongCollection> this.current.content).position++;
			} else {
				if (this.isLoop) {
					collection.position = 0;
				} else {
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
			return;
		}

		const currentSong = this.currentSong!;

		const tracksResponse = await this.player.node.rest.loadTracks(
			currentSong.url,
		);

		const track = tracksResponse.tracks[0]!.track;

		this.player.play(track);

		const method: (embed: EmbedPayload) => unknown = interaction
			? (embed) => interaction.editResponse({ embeds: [embed] })
			: (embed) => this.textChannel!.send({ embeds: [embed] });

		method({
			title: !wasLooped ? '🎶 Playing song' : '🎶 Replaying song',
			description: `${!wasLooped ? 'Now playing' : 'Replaying'} [${
				bold(currentSong.title)
			}](${currentSong.url}) as requested by ${
				mention(this.current.requestedBy, MentionType.USER)
			}.`,
			color: configuration.interactions.responses.colors.invisible,
		});
	}

	skip(interaction: Interaction): void {
		this.player.stop();

		interaction.respond({
			embeds: [{
				title: '⏭️ Skipped',
				description: 'The current song has been skipped.',
				color: configuration.interactions.responses.colors.invisible,
			}],
		});
	}

	unskip(interaction: Interaction): void {
		if (this.current) {
			this.queue.unshift(this.current);
		}

		this.queue.unshift(this.history.pop()!);

		this.current = undefined;

		if (!this.player.track) {
			this.player.stop();

			this.advanceQueueAndPlay();
		}

		interaction.respond({
			embeds: [{
				title: '⏮️ Unskipped',
				description: 'The last played song has been brought back.',
				color: configuration.interactions.responses.colors.invisible,
			}],
		});
	}

	/** Sets the volume of the player. */
	setVolume(interaction: Interaction, volume: number): void {
		this.volume = volume;

		this.player.setVolume(this.volume);

		interaction.respond({
			embeds: [{
				title: '🔊 Volume set',
				description: `The volume has been set to ${volume}%.`,
				color: configuration.interactions.responses.colors.invisible,
			}],
		});
	}

	pause(interaction: Interaction): void {
		this.player.pause(true);

		interaction.respond({
			embeds: [{
				title: '⏸️ Paused',
				description: 'The current song has been paused.',
				color: configuration.interactions.responses.colors.invisible,
			}],
		});
	}

	unpause(interaction: Interaction): void {
		this.player.pause(false);

		interaction.respond({
			embeds: [{
				title: '▶️ Unpaused',
				description: 'The current song has been unpaused.',
				color: configuration.interactions.responses.colors.invisible,
			}],
		});
	}

	replay(): void {
		const previousLoopState = this.isLoop;

		this.isLoop = true;

		this.player.once('trackStart', () => this.isLoop = previousLoopState);
		this.player.stop();
	}
}

export { MusicController };
