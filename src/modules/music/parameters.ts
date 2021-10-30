import { ApplicationCommandOptionType } from "../../../deps.ts";
import { Option } from "../option.ts";

const index: Option = {
  name: "index",
  description: "The index of the song in the queue.",
  required: false,
  type: ApplicationCommandOptionType.INTEGER,
};

const title: Option = {
  name: "title",
  description: "The title of the song.",
  required: false,
  type: ApplicationCommandOptionType.STRING,
};

const url: Option = {
  name: "url",
  description: "The URL to the song.",
  required: false,
  type: ApplicationCommandOptionType.STRING,
};

const by: Option = {
  name: "by",
  description: "The time representation in `hh:mm:ss` format.",
  required: false,
  type: ApplicationCommandOptionType.INTEGER,
};

const to: Option = {
  name: "to",
  description: "The time representation in `hh:mm:ss` format.",
  required: false,
  type: ApplicationCommandOptionType.INTEGER,
};

export { by, index, title, to, url };
