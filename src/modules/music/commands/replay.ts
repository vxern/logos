import { Interaction } from "../../../../deps.ts";
import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";

const command: Command = {
  name: "replay",
  availability: Availability.MEMBERS,
  description: "Begins playing the currently playing song from the start.",
  handle: replay,
};

async function replay(interaction: Interaction) {
  /// TODO(vxern):
  /// If there is no song playing, reject interaction nicely.
  /// Otherwise, start playing the current song from the start.
}

export default command;
