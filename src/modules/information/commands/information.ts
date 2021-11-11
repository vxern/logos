import dayjs from "https://cdn.skypack.dev/dayjs";
import relativeTime from "https://cdn.skypack.dev/dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
import { Interaction } from "../../../../deps.ts";
import { Command } from "../../../commands/command.ts";
import { OptionType } from "../../../commands/option.ts";
import { fromHex } from "../../../utils.ts";

const command: Command = {
  name: "information",
  options: [{
    name: "bot",
    description: "Displays information about the bot.",
    type: OptionType.SUB_COMMAND,
    handle: bot,
  }, {
    name: "server",
    type: OptionType.SUB_COMMAND_GROUP,
    options: [{
      name: "information",
      description: "Displays information about the server.",
      type: OptionType.SUB_COMMAND,
      handle: guild,
    }, {
      name: "statistics",
      description: "Displays statistics of the server.",
      type: OptionType.SUB_COMMAND,
    }],
  }],
};

async function bot(interaction: Interaction): Promise<void> {
  const bot = interaction.client.user!;

  interaction.respond({
    embeds: [{
      title: bot.username,
      thumbnail: {
        url: bot.avatarURL(),
        height: 16,
        width: 16,
      },
      color: fromHex("#303434"),
      fields: [{
        name: "What am I?",
        value:
          `I am ${bot.username}, a Discord application created to provide language-learning servers with the highest quality features.`,
      }, {
        name: "How was I made?",
        value:
          "I am powered by [TypeScript](https://www.typescriptlang.org/) running within [Deno](https://deno.land/). I interact with [Discord's API](https://discord.com/developers/docs/intro) with the help of [Harmony](https://github.com/harmonyland/harmony).",
      }],
    }],
    ephemeral: true,
  });
}

async function guild(interaction: Interaction): Promise<void> {
  const guild = interaction.guild!;
  const createdAt = dayjs(guild.timestamp);

  interaction.respond({
    embeds: [{
      title: `Information about ${guild.name!}`,
      thumbnail: {
        url: guild.iconURL(),
        height: 16,
        width: 16,
      },
      color: fromHex("#303434"),
      fields: [{
        name: "🖋️ Description",
        value: guild.description!,
        inline: true,
      }, {
        name: "⏱️ Created",
        value: `${createdAt.format("D MMMM YYYY")} (${createdAt.fromNow()})`,
        inline: true,
      }],
    }],
  });
}

export default command;
