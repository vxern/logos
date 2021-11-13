import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";
import { OptionType } from "../../../commands/option.ts";

const config = {
  volume: {
    maximum: 150,
  },
};

const command: Command = {
  name: "volume",
  availability: Availability.MEMBERS,
  options: [{
    name: "display",
    description: "Displays the volume of playback.",
    type: OptionType.SUB_COMMAND,
  }, {
    name: "set",
    description: "Sets the volume of playback.",
    type: OptionType.SUB_COMMAND,
    options: [{
      name: "volume",
      description: `A value between 0 and ${config.volume.maximum}`,
      required: true,
      type: OptionType.INTEGER,
    }],
  }],
};

export default command;
