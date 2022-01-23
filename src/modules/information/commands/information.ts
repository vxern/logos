import dayjs from "https://cdn.skypack.dev/dayjs";
import relativeTime from "https://cdn.skypack.dev/dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
import { Guild, Interaction } from "../../../../deps.ts";
import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";
import { OptionType } from "../../../commands/option.ts";
import configuration from "../../../configuration.ts";
import { bold, italic, list, mention, MentionType } from "../../../formatting.ts";
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
    description: "Displays information about the server.",
    type: OptionType.SUB_COMMAND,
    handle: guild,
  }],
};

function bot(interaction: Interaction): void {
  const application = interaction.client.user!;

  interaction.respond({
    embeds: [{
      title: application.username,
      thumbnail: { url: application.avatarURL() },
      color: configuration.responses.colors.invisible,
      fields: [{
        name: "What am I?",
        value:
          `I am ${bold(application.username)}, a Discord application created to provide language-learning servers with the highest quality features, such as:
${list([
  "Rich social interactions", 
  "Intuitive role management",
  "Translation and morphology look-ups",
  "Event scheduling",
  "Music playback",
  "Article creation",
  "Server structure synchronisation",
])}`, }, {
        name: "How was I made?",
        value:
          "I am powered by [TypeScript](https://www.typescriptlang.org/) running within [Deno](https://deno.land/). I interact with [Discord's API](https://discord.com/developers/docs/intro) with the help of [Harmony](https://github.com/harmonyland/harmony).",
      }, {
        name: "How can you add me to your server?",
        value: "You cannot *juuust* yet. I was made for the purpose of managing a select few language-learning servers, such as the [Armenian](https://discord.me/learnarmenian), [Belarusian](https://discord.me/learnbelarusian) and [Romanian](https://discord.me/learnromanian) communities.",
      }, {
        name: "Am I open-source?",
        value: `Unfortunately, no. However, my predecessor, Talon, ${italic("is")}. You can view his source code [here](https://github.com/vxern/talon).`,
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
      title: `Information about '${guild.name!}'`,
      thumbnail: { url: guild.iconURL() },
      color: configuration.responses.colors.invisible,
      fields: [{
        name: "🖋️ Description",
        value: guild.description ?? 'No description provided.',
        inline: true,
      }, {
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

async function getProficiencyDistribution(guild: Guild): Promise<string> {
  const members = (await guild.members.fetchList()).filter((member) => !member.user.bot);

  const proficiencies = getProficiencyCategory().collection!.list!;
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
