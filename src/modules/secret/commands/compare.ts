import {
  ApplicationCommandOptionType,
  colors,
  Embed,
  Guild,
  InteractionResponseType,
} from "../../../../deps.ts";
import { Command, noneAvailable, unimplemented } from "../../command.ts";
import { bold, codeMultiline } from "../../../client.ts";
import {
  analyseStructure,
  GuildStructure,
} from "../secret.ts";

const command: Command = {
  name: "compare",
  description: noneAvailable,
  options: [{
    name: "server",
    description: noneAvailable,
    options: [{
      name: "structures",
      description:
        "Compares the server's server structure to that of the template guild.",
      type: ApplicationCommandOptionType.SUB_COMMAND,
      handle: async (interaction) => {
        const source = (await interaction.client.guilds.get(Deno.env.get("TEMPLATE_GUILD_ID")!))!;
        const target = interaction.guild!;

        const comparison = await compareStructures({
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

        return interaction.respond({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          embeds: [
            embed,
          ],
        });
      },
    }, {
      name: "roles",
      description:
        "Compares the server's role list to that of the template guild.",
      type: ApplicationCommandOptionType.SUB_COMMAND,
      handle: unimplemented,
    }],
    type: ApplicationCommandOptionType.SUB_COMMAND_GROUP,
  }],
};

async function compareStructures(
  { source, target }: { source: Guild; target: Guild },
): Promise<GuildStructure> {
  const sourceStructure = await analyseStructure(source);
  const targetStructure = await analyseStructure(target);

  console.log(
    colors.yellow(
      `Analysing structure difference between template guild and ${
        colors.bold(target.name!)
      }...`,
    ),
  );
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
