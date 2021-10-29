import { Command, unimplemented } from "../../command.ts";

const config = {
  volume: {
    maximum: 150,
  },
};

const command: Command = {
  name: "volume",
  options: [{
    type: "SUB_COMMAND",
    name: "display",
    description: "Displays the volume of playback.",
  }, {
    type: "SUB_COMMAND",
    name: "set",
    description: "Sets the volume of playback.",
    options: [{
      type: "INTEGER",
      name: "volume",
      description: `A value between 0 and ${config.volume.maximum}`,
      required: true,
    }],
  }],
  execute: unimplemented,
};

export default command;
