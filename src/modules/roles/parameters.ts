import { ApplicationCommandOption as Option } from "../../../deps.ts";

const role: Option = {
  type: "ROLE",
  name: "role",
  description: "The name of the role.",
  required: true,
};

export { role };
