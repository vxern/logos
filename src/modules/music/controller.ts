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

	/** Limits the number of songs that the queue can contain. */
	static readonly limit = 20;

	/** List of songs which have already been played. */
	private played: SongListing[] = [];
	/** The current song being played. */
	private current?: SongListing;
	/** List of songs which are due to be played. */
	private queue: SongListing[] = [];

	/** Indicates whether the controller is paused or not. */
	private paused = false;
	/**
	 * Indicates whether the current song is to be played again once it ends.
	 */
	private loop = false;
	/** The volume at which the song is being played. */
	private volume = 1;

	constructor(client: Client, guild: Guild) {
		super(guild);
		this.player = client.node.createPlayer(BigInt(guild.id));
	}

	/** Checks whether the queue holds fewer items than the limit. */
	get canAddToQueue(): boolean {
		return this.queue.length < MusicController.limit;
	}

	/**
	 * Gets the voice state of a member within a guild.
	 *
	 * @param member - The member whose voice state to get.
	 * @returns The voice state or `undefined`.
	 */
	getState(member: Member): Promise<VoiceState | undefined> {
		return this.guild.voiceStates.resolve(member.user.id);
	}

	/** Checks if the controller is in the process of playing a song. */
	get isPlaying(): boolean {
		return this.current !== undefined;
	}

	/** Checks whether the controller is already managing a song. */
	get isOccupied(): boolean {
		return !!this.current;
	}

	/**
	 * Adds a song to the queue of songs to be played.
	 *
	 * @param listing - The song listing to add to queue.
	 * @returns
	 */
	addToQueue(listing: SongListing): void {
		if (this.current) {
			this.queue.push(listing);
			return;
		}
		this.current = listing;
	}

	/**
	 * Checks if the user can play music by verifying several factors, such as
	 * whether or not the user is in a voice channel and has provided the correct
	 * arguments.
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
		if (!data.options[0].options) {
			interaction.respond({
				embeds: [{
					title: 'You must provide the song\'s title or URL.',
					description: `To find a song, ${
						interaction.client.user!.username
					} needs to know its title or a path to it. Please provide the song's title or a link to it.`,
					color: configuration.responses.colors.red,
				}],
			});
			return false;
		}

		// More than one argument provided, when only one is accepted by the command.
		if (data.options[0].options.length !== 1) {
			interaction.respond({
				embeds: [{
					title: 'You may only provide one piece of information about a song.',
					description: `${
						interaction.client.user!.username
					} uses only one piece of information to find a song; either its title or the link to it. Multiple pieces of information are redundant, and possibly disparate.`,
					color: configuration.responses.colors.red,
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
					color: configuration.responses.colors.red,
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
					color: configuration.responses.colors.red,
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
			this.player.connect(BigInt(channel.id));
		}

		const track = await this.player.node.rest.loadTracks(
			this.current!.song!.url,
		);

		this.player.play(track.tracks[0].track);
	}
}

export { MusicController };
