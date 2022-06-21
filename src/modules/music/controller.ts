import { Player } from 'https://deno.land/x/lavadeno@3.2.2/mod.ts';
import {
	Guild,
	Interaction,
	InteractionApplicationCommandData,
	Member,
	VoiceChannel,
	VoiceState,
} from '../../../deps.ts';
import { Client } from '../../client.ts';
import configuration from '../../configuration.ts';
import { Controller } from '../controller.ts';
import { SongListing } from './data/song-listing.ts';

class MusicController extends Controller {
	/** The audio player associated with this controller. */
	private player: Player;

	/** List of songs which have already been played. */
	private history: SongListing[] = [];
	/** The current song being played. */
	private current?: SongListing;
	/** List of songs which are due to be played. */
	private queue: SongListing[] = [];

	/** The volume at which the song is being played. */
	private volume = 1;

	/** Indicates whether the controller is paused or not. */
	private isPaused = false;
	/**
	 * Indicates whether the current song is to be played again once it ends.
	 */
	private isLoop = false;

	constructor(client: Client, guild: Guild) {
		super(guild);
		this.player = client.node.createPlayer(BigInt(guild.id));
	}

	/** Checks whether the queue holds fewer items than the limit. */
	private get canAddToQueue(): boolean {
		return this.queue.length < configuration.music.maxima.songs.queue;
	}

	/**
	 * Gets the voice state of a member within a guild.
	 *
	 * @param member - The member whose voice state to get.
	 * @returns The voice state or `undefined`.
	 */
	private getState(member: Member): Promise<VoiceState | undefined> {
		return this.guild.voiceStates.resolve(member.user.id);
	}

	/**
	 * Adds a song to the queue of songs to be played.
	 *
	 * @param listing - The song listing to add to queue.
	 * @returns
	 */
	addToQueue(listing: SongListing): void {
		// If there is already a song currently playing, add it to queue.
		this.queue.push(listing);
		return;
	}

	/**
	 * Checks if the user can play music by verifying several factors, such as
	 * whether or not the user is in a voice channel, and if they have provided
	 * the correct arguments.
	 *
	 * @param interaction - The interaction.
	 * @param data - The command data.
	 * @returns Whether the user can play music.
	 */
	async canPlay(
		interaction: Interaction,
		data: InteractionApplicationCommandData,
	): Promise<boolean> {
		// No arguments provided.
		if (!data.options[0]?.options) {
			interaction.respond({
				embeds: [{
					title: 'You must provide the song\'s title or URL.',
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
				embeds: [{
					title: 'You may only provide one piece of information about a song.',
					description: `${
						interaction.client.user!.username
					} uses only one piece of information to find a song; either its title or the link to it. Multiple pieces of information are redundant, and possibly disparate.`,
					color: configuration.interactions.responses.colors.red,
				}],
			});
			return false;
		}

		// The user cannot add to the queue due to one reason or another.
		if (!this.canAddToQueue) {
			interaction.respond({
				embeds: [{
					title: 'The queue is full.',
					description:
						'Try removing a song from the song queue, skip the current song to advance the queue immediately, or wait until the current song stops playing.',
					color: configuration.interactions.responses.colors.red,
				}],
			});
			return false;
		}

		// The user is not in a voice channel.
		if (!(await this.getState(interaction.member!))) {
			interaction.respond({
				embeds: [{
					title: 'You are not in a voice channel.',
					description: 'To play music, you must be in a voice channel.',
					color: configuration.interactions.responses.colors.red,
				}],
			});
			return false;
		}

		return true;
	}

	async play(channel: VoiceChannel): Promise<void> {
		// If the player is not connected to a voice channel, or if it is connected
		// to a different voice channel, connect to the new voice channel.
		if (
			!this.player.connected || this.player.channelId !== BigInt(channel.id)
		) {
			this.player.connect(BigInt(channel.id), { deafen: true });
		}

		const response = await this.player.node.rest.loadTracks(
			this.current!.song!.url,
		);

		const track = response.tracks[0]!;
	}

	private pushToHistory(listing: SongListing): void {
		if (this.history.length === configuration.music.maxima.songs.history) {
			this.history.shift();
		}

		this.history.push(listing);
	}

	private shiftQueue(): void {
	}

	private async loop(): Promise<void> {
		if (this.current) {
			this.pushToHistory(this.current);
		}

		this.curren;

		this.current = undefined;

		await this.player.setVolume(this.volume);

		this.player.play(track.track);

		await this.player.setVolume(this.volume);

		this.player.play(track.track);
	}
}

export { MusicController };
