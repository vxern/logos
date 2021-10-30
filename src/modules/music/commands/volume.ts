import { ApplicationCommandOptionType } from "../../../../deps.ts";
import { Command, noneAvailable, unimplemented } from "../../command.ts";

const config = {
  volume: {
    maximum: 150,
  },
};

const command: Command = {
  name: "volume",
  description: noneAvailable,
  options: [{
    name: "display",
    description: "Displays the volume of playback.",
    type: ApplicationCommandOptionType.SUB_COMMAND,
    handle: unimplemented,
  }, {
    name: "set",
    description: "Sets the volume of playback.",
    options: [{
      name: "volume",
      description: `A value between 0 and ${config.volume.maximum}`,
      required: true,
      type: ApplicationCommandOptionType.INTEGER,
    }],
    type: ApplicationCommandOptionType.SUB_COMMAND,
    handle: unimplemented,
  }],
};

export default command;
