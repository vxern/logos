import {
  ButtonStyle,
  EmbedPayload,
  Interaction,
  MessageComponentType,
} from "../../../../deps.ts";
import { Client } from "../../../client.ts";
import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";
import { OptionType } from "../../../commands/option.ts";
import { capitalise } from "../../../formatting.ts";
import { fromHex } from "../../../utils.ts";
import information, { getChannelMention } from "../information/information.ts";

const command: Command = {
  name: "post",
  availability: Availability.OWNER,
  options: [{
    name: "rules",
    type: OptionType.SUB_COMMAND,
    handle: rules,
  }, {
    name: "welcome",
    type: OptionType.SUB_COMMAND,
    handle: welcome,
  }],
};

async function rules(interaction: Interaction) {
  const embeds: EmbedPayload[] = [];
  for (const [_, section] of Object.entries(information)) {
    const embed = await section.generateEmbed(interaction.guild!);
    // embed.title = name.toUpperCase();
    embed.color = section.color;
    // embed.image = { url: section.image };
    embeds.push(embed);
  }

  interaction.respond({
    embeds: embeds,
  });
}

async function welcome(interaction: Interaction) {
  const language = Client.getLanguage(interaction.guild!)!;

  interaction.respond({
    embeds: [{
      title:
        `Welcome to the largest Discord server dedicated to teaching and learning the ${
          capitalise(language)
        } language.`,
      description:
        `To enter the server and become its official member, read the information contained within ${(await getChannelMention(
          interaction.guild!,
          "rules",
        ))} to get yourself familiarised with what you should expect from the server, and press 'I have read the rules' below.`,
      color: fromHex("#F28123"),
      /* image: {
        url: "https://i.imgur.com/nxcnx7j.png",
      },*/
    }],
    components: [{
      type: MessageComponentType.ActionRow,
      components: [{
        type: MessageComponentType.BUTTON,
        style: ButtonStyle.GREY,
        label: "I have read the rules, and agree to abide by them",
        customID: "ACCEPTED_RULES",
        emoji: {
          name: "✅",
        },
      }],
    }],
  });
}

export default command;
