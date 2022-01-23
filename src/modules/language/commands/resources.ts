import { Interaction } from "../../../../deps.ts";
import { Client } from "../../../client.ts";
import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";
import configuration from "../../../configuration.ts";
import { capitalise, mention, MentionType } from "../../../formatting.ts";
import { fromHex } from "../../../utils.ts";

const command: Command = {
  name: "resources",
  availability: Availability.MEMBERS,
  description: "Displays a list of resources to learn the language.",
  handle: resources,
};

function resources(interaction: Interaction): void {
  const language = Client.getLanguage(interaction.guild!);

  interaction.respond({
    embeds: [{
      title: "Resources",
      description: language
        ? `Resources to learn the ${capitalise(language)} language are available [here](https://github.com/vxern/${language?.toLowerCase()}).

Feel free to contribute to the project by forking the repository, adding your own resources, and creating a pull request.

If you don't know how to use git, you can still contribute by listing the resources and tagging ${mention(configuration.guilds.owner.id, MentionType.USER)}.`
        : "This server does not have a designated language, and therefore no resources are available for it.",
      color: fromHex("#d6e3f8"),
    }],
  });
}

export default command;
