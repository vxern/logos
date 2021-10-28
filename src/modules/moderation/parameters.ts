import { ApplicationCommandOption as Option } from "../../../deps.ts";

const duration: Option = {
  type: "STRING",
  name: "duration",
  description: "The duration of the sanction.",
  required: true,
};

const reason: Option = {
  type: "STRING",
  name: "reason",
  description: "The reason for the sanction or its repeal.",
  required: true,
};

export { duration, reason };
