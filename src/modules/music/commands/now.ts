import { Interaction } from "../../../../deps.ts";
import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";

const command: Command = {
  name: "now",
  availability: Availability.MEMBERS,
  description: "Displays the currently playing song.",
  handle: now,
};

async function now(interaction: Interaction) {
  /// TODO(vxern):
  /// Display the current playing song.
}

export default command;
