import { ApplicationCommandOption as Option } from "../../deps.ts";

const elements: Option = {
  type: "INTEGER",
  name: "number",
  description: "The number of elements to manage.",
  required: true,
};

const index: Option = {
  type: "INTEGER",
  name: "index",
  description: "The index of the element.",
  required: true,
};

const user: Option = {
  type: "STRING",
  name: "user",
  description: "The user's name, tag, ID or mention.",
  required: true,
};

export { elements, index, user };
