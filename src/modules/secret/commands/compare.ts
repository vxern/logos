import {
  colors,
  Embed,
  Guild,
  InteractionResponseType,
} from "../../../../deps.ts";
import { Command } from "../../../commands/command.ts";
import { OptionType } from "../../../commands/option.ts";
import { bold, codeMultiline } from "../../../formatting.ts";
import { analyseStructure, GuildStructure } from "../module.ts";

const command: Command = {
  name: "compare",
  options: [{
    name: "server",
    type: OptionType.SUB_COMMAND_GROUP,
    options: [{
      name: "structures",
      description:
        "Compares the server's server structure to that of the template guild.",
      type: OptionType.SUB_COMMAND,
      handle: async (interaction) => {
        const source = (await interaction.client.guilds.get(
          Deno.env.get("TEMPLATE_GUILD_ID")!,
        ))!;
        const target = interaction.guild!;

        console.log(
          colors.yellow(
            `Analysing structural differences between template guild and ${
              colors.bold(target.name!)
            } as per ${bold(interaction.user.username)}'s request...'`,
          ),
        );
        const comparison = await analyseStructuralDifferences({
          source: source,
          target: target,
        });

        const embed = new Embed();
        embed.setTitle(
          (comparison.categories.length === 0 &&
              comparison.channels.length === 0)
            ? "Structure match"
            : "Missing channels",
        );
        if (comparison.channels.length !== 0) {
          embed.setDescription(
            codeMultiline(
              comparison.channels.map((channel) => channel.name).join("\n"),
            ),
          );
        } else {
          if (comparison.categories.length === 0) {
            embed.setDescription(
              `The server structure of ${
                bold(target.name!)
              } matches that of the template guild.`,
            );
          }
        }

        if (comparison.categories.length !== 0) {
          embed.setFields(comparison.categories.map((category) => {
            return {
              name: category.category.name,
              value: codeMultiline(
                category.channels.map((channel) => channel.name)
                  .join(
                    "\n",
                  ),
              ),
            };
          }));
        }

        interaction.respond({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          ephemeral: true,
          embeds: [
            embed,
          ],
        });
      },
    }, {
      name: "roles",
      description:
        "Compares the server's role list to that of the template guild.",
      type: OptionType.SUB_COMMAND,
    }],
  }],
};

async function analyseStructuralDifferences(
  { source, target }: { source: Guild; target: Guild },
): Promise<GuildStructure> {
  const sourceStructure = await analyseStructure(source);
  const targetStructure = await analyseStructure(target);

  const missingChannels = sourceStructure.channels.filter((sourceChannel) =>
    !targetStructure.channels.some((targetChannel) =>
      targetChannel.name === sourceChannel.name
    )
  );
  const missingCategories = sourceStructure.categories.filter((
    sourceCategory,
  ) => {
    const targetCategory = targetStructure.categories.find((targetCategory) =>
      targetCategory.category.name === sourceCategory.category.name
    );
    if (!targetCategory) return true;
    sourceCategory.channels = sourceCategory.channels.filter((sourceChannel) =>
      !targetCategory.channels.some((targetChannel) =>
        targetChannel.name === sourceChannel.name
      )
    );
    if (sourceCategory.channels.length === 0) {
      return false;
    }
    return true;
  });

  return {
    channels: missingChannels,
    categories: missingCategories,
  };
}

export default command;
