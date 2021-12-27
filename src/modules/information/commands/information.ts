import dayjs from "https://cdn.skypack.dev/dayjs";
import relativeTime from "https://cdn.skypack.dev/dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
import { Guild, Interaction } from "../../../../deps.ts";
import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";
import { OptionType } from "../../../commands/option.ts";
import configuration from "../../../configuration.ts";
import { mention, MentionType } from "../../../formatting.ts";
import { getProficiencyCategory } from "../../roles/module.ts";

const command: Command = {
  name: "information",
  availability: Availability.MEMBERS,
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
      handle: statistics,
    }],
  }],
};

function bot(interaction: Interaction): void {
  const bot = interaction.client.user!;

  interaction.respond({
    embeds: [{
      title: bot.username,
      thumbnail: { url: bot.avatarURL() },
      color: configuration.responses.colors.invisible,
      fields: [{
        name: "What am I?",
        value:
          `I am ${bot.username}, a Discord application created to provide language-learning servers with the highest quality features, such as rich social interactions, intuitive role management, translation and morphology look-ups, event scheduling, music playback, article creation, server structure synchronisation and more.`,
      }, {
        name: "How was I made?",
        value:
          "I am powered by [TypeScript](https://www.typescriptlang.org/) running within [Deno](https://deno.land/). I interact with [Discord's API](https://discord.com/developers/docs/intro) with the help of [Harmony](https://github.com/harmonyland/harmony).",
      }],
    }],
    ephemeral: true,
  });
}

function guild(interaction: Interaction): void {
  const guild = interaction.guild!;

  interaction.respond({
    embeds: [{
      title: `Information about ${guild.name!}`,
      thumbnail: { url: guild.iconURL() },
      color: configuration.responses.colors.invisible,
      fields: [{
        name: "🖋️ Description",
        value: guild.description ?? 'No description provided.',
        inline: true,
      }, {
        name: "👑 Owner",
        value: mention(guild.ownerID!, MentionType.USER),
        inline: true,
      }],
    }],
    ephemeral: true,
  });
}

async function statistics(interaction: Interaction): Promise<void> {
  const guild = interaction.guild!;
  const createdAt = dayjs(guild.timestamp);

  interaction.respond({
    embeds: [{
      title: `Information about ${guild.name!}`,
      thumbnail: { url: guild.iconURL() },
      color: configuration.responses.colors.invisible,
      fields: [{
        name: "🧑 Members",
        value: guild.memberCount!.toString(),
        inline: true,
      }, {
        name: "⏱️ Created",
        value: `${createdAt.format("D MMMM YYYY")} (${createdAt.fromNow()})`,
        inline: true,
      }, {
        name: "🎓 Proficiency Distribution",
        value: (await getProficiencyDistribution(guild)).toString(),
        inline: false,
      }],
    }],
    ephemeral: true,
  });
}

async function getProficiencyDistribution(guild: Guild): Promise<string> {
  const members = (await guild.members.fetchList()).filter((member) => !member.user.bot);

  const proficiencies = getProficiencyCategory().collection!.list!
  const proficiencyNames = proficiencies.map((proficiency) => proficiency.name);

  const distribution = new Array(proficiencyNames.length).fill(0);

  for (const member of members) {
    const roleNames = (await member.roles.array()).map((role) => role.name);
    for (let i = 0; i < proficiencyNames.length; i++) {
      if (roleNames.includes(proficiencyNames[i])) {
        distribution[i]++;
        continue;
      }
    }
  }

  const proficiencyTags = (await guild.roles.fetchAll())
    .filter((role) => proficiencyNames.includes(role.name))
    .map((role) => mention(role.id, MentionType.ROLE));

  return displayProficiencyDistribution(proficiencyTags, members.length, distribution);
}

function displayProficiencyDistribution(proficiencyTags: string[], memberCount: number, distribution: number[]): string {
  const without = memberCount - distribution.reduce((a, b) => a + b, 0);

  distribution.unshift(without);
  proficiencyTags.unshift(`without a proficiency role.`);

  const proficiencyDistributionPrinted = distribution.map(
    (count, index) => `${getPercentageComposition(count, memberCount)}% ${proficiencyTags[index]}`
  ).reverse();

  return proficiencyDistributionPrinted.join("\n");
}

function getPercentageComposition(number: number, total: number): string {
  return ((number / total) * 100).toPrecision(3);
}

export default command;
