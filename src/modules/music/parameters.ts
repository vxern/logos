import { ApplicationCommandOption as Option } from "../../../deps.ts";

const index: Option = {
  type: "STRING",
  name: "index",
  description: "The index of the song in the queue.",
  required: false,
};

const title: Option = {
  type: "STRING",
  name: "title",
  description: "The title of the song.",
  required: false,
};

const url: Option = {
  type: "STRING",
  name: "url",
  description: "The URL to the song.",
  required: false,
};

const by: Option = {
  type: "STRING",
  name: "by",
  description: "The time representation in `hh:mm:ss` format.",
  required: false,
};

const to: Option = {
  type: "STRING",
  name: "to",
  description: "The time representation in `hh:mm:ss` format.",
  required: false,
};

export { by, index, title, to, url };
