import ytdl from "https://deno.land/x/ytdl_core@v0.0.2/mod.ts";
import {
  Interaction,
  InteractionApplicationCommandData,
  VoiceState,
} from "../../../../deps.ts";
import { Client } from "../../../client.ts";
import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";
import { OptionType } from "../../../commands/option.ts";
import configuration from "../../../configuration.ts";
import { handlers } from "../data/sources/sources.ts";
import { SongListing } from "../data/song-listing.ts";
import { title, url } from "../parameters.ts";
import { MusicController } from "../controller.ts";

const command: Command = {
  name: "play",
  availability: Availability.MEMBERS,
  options: Object.entries(handlers).map(([name, resolve]) => {
    return {
      name: name.toLowerCase(),
      description: `Requests to play a song from ${name}.`,
      type: OptionType.SUB_COMMAND,
      options: [title, url],
      handle: async (interaction) => {
        // Set up information for the controller.
        const controller = Client.music.get(interaction.guild!.id)!;
        const data = interaction.data! as InteractionApplicationCommandData;

        // Check if the user can play music.
        if (!(await controller.canPlay(interaction, data))) return;

        // Find the song.
        const listing = await resolve(interaction, data.options[0].options![0]);
        console.log(listing);
        if (!listing) return notFound(interaction);

        // Play the song.
        play(controller, interaction, listing);
      },
    };
  }),
};

/**
 * Tells the user that the song they requested was not found.
 *
 * @param interaction - The interaction.
 */
async function notFound(interaction: Interaction): Promise<void> {
  if (interaction.responded) return;

  interaction.respond({
    embeds: [{
      title: "Couldn't find the requested song.",
      description:
        "You could try an alternative search, or request a different song.",
      color: configuration.responses.colors.red,
    }],
  });
}

/**
 * Taking a song listing and the 'state' of the voice connection, plays the song.
 *
 * @param controller - The music controller.
 * @param interaction - The interaction.
 * @param state - The voice state / voice connection.
 * @param listing - The song listing.
 */
async function play(
  controller: MusicController,
  interaction: Interaction,
  listing: SongListing | undefined,
): Promise<void> {
  const state = await interaction.guild!.voiceStates.get(
    interaction.user.id,
  );
  if (!state) {
    console.error(
      `Attempted to play listing requested by ${listing
        ?.requestedBy} in a guild with no voice state.`,
    );
    return;
  }

  if (listing) {
    controller.addToQueue(listing);
  }

  /*
  if (!(await controller.getState(interaction.guild!))) {
    await controller.client.voice.join(state.channelID!);
  }
  */

  //const applicationState = await controller.getState(interaction.guild!);
  controller.play(state.channel!);
}

export { play };
export default command;
