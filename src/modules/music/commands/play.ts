import { InteractionHandler } from "../../../client.ts";
import { Availability } from "../../../commands/availability.ts";
import { Command, unimplemented } from "../../../commands/command.ts";
import { Option, OptionType } from "../../../commands/option.ts";
import { title, url } from "../parameters.ts";

const platforms = ["Spotify", "YouTube"] as const;
type Platform = (typeof platforms)[number];

const handlers: Record<Platform, InteractionHandler> = {
  "Spotify": unimplemented,
  "YouTube": unimplemented,
};

const command: Command = {
  name: "play",
  availability: Availability.MEMBERS,
  options: platforms.map((platform) => {
    return {
      name: platform.toLowerCase(),
      description: `Requests to play a song from ${platform}.`,
      type: OptionType.SUB_COMMAND,
      options: [title, url],
      handle: handlers[platform],
    };
  }),
};

export default command;
