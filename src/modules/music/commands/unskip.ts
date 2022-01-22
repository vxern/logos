import { Interaction } from "../../../../deps.ts";
import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";

const command: Command = {
  name: "unskip",
  availability: Availability.MEMBERS,
  description: "Plays the last played song.",
  handle: unskip,
};

async function unskip(interaction: Interaction) {
  /// TODO(vxern):
  /// If there is no song in history, reject interaction nicely.
  /// Otherwise, unskip the song.
}

export default command;
