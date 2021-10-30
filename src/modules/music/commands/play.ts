import { ApplicationCommandOptionType } from "../../../../deps.ts";
import {
  Command,
  InteractionHandler,
  noneAvailable,
  unimplemented,
} from "../../command.ts";
import { Option } from "../../option.ts";
import { title, url } from "../parameters.ts";

const platforms = ["Spotify", "YouTube"] as const;
type Platform = (typeof platforms)[number];

const handlers: Record<Platform, InteractionHandler> = {
  "Spotify": unimplemented,
  "YouTube": unimplemented,
};

const command: Command = {
  name: "play",
  description: noneAvailable,
  options: platforms.map((platform) => {
    return {
      name: platform.toLowerCase(),
      description: `Requests to play a song from ${platform}.`,
      options: [title, url],
      type: ApplicationCommandOptionType.SUB_COMMAND,
      handle: handlers[platform],
    };
  }) as Option[],
};

export default command;
