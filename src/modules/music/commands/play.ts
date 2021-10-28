import { Command, unimplemented } from "../../command.ts";
import { title, url } from "../parameters.ts";

const platforms: string[] = ["YouTube", "Spotify"];

const command: Command = {
  name: "play",
  description: "Requests to play a song.",
  options: platforms.map((platform) => {
    return {
      type: "SUB_COMMAND",
      name: platform.toLowerCase(),
      description: `From ${platform}`,
      options: [title, url],
    };
  }),
  execute: unimplemented,
};

export default command;
