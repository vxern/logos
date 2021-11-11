import { Option, OptionType } from "../../commands/option.ts";

const index: Option = {
  name: "index",
  description: "The index of the song in the queue.",
  required: false,
  type: OptionType.INTEGER,
};

const title: Option = {
  name: "title",
  description: "The title of the song.",
  required: false,
  type: OptionType.STRING,
};

const url: Option = {
  name: "url",
  description: "The URL to the song.",
  required: false,
  type: OptionType.STRING,
};

const by: Option = {
  name: "by",
  description: "The time representation in `hh:mm:ss` format.",
  required: false,
  type: OptionType.INTEGER,
};

const to: Option = {
  name: "to",
  description: "The time representation in `hh:mm:ss` format.",
  required: false,
  type: OptionType.INTEGER,
};

export { by, index, title, to, url };
