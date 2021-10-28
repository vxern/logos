import {
  ApplicationCommandInteraction,
  ApplicationCommandOption,
  InteractionResponseType,
} from "../../deps.ts";

interface Command {
  name: string;
  description?: string;
  options?: ApplicationCommandOption[];
  execute: (
    interaction: ApplicationCommandInteraction,
  ) => Promise<ApplicationCommandInteraction>;
}

function unimplemented(
  interaction: ApplicationCommandInteraction,
): Promise<ApplicationCommandInteraction> {
  return interaction.respond({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    content: "This command is merely a placeholder.",
    ephemeral: true,
  });
}

export { unimplemented };
export type { Command };
