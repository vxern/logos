import { EmbedPayload, Guild } from "../../../../deps.ts";
import { bold, mention, MentionType } from "../../../formatting.ts";
import { findChannelByName, fromHex, getInvite } from "../../../utils.ts";
import rules from "./rules.ts";

interface Section {
  image: string;
  color: number;
  generateEmbed: (guild: Guild) => Promise<EmbedPayload>;
}

interface Information {
  [key: string]: Section;
}

const information: Information = {
  rules: {
    image: "https://i.imgur.com/wRBpXcY.png",
    color: fromHex("#FF9A76"),
    generateEmbed: async (guild) => {
      const fields = [];
      for (const [title, generateRule] of Object.entries(rules)) {
        fields.push({
          name: `💠 ${bold(title.toUpperCase())}`,
          value: await generateRule(guild),
          inline: false,
        });
      }

      return {
        fields: fields,
      };
    },
  },
  /*
  categories: {
    image: "https://i.imgur.com/NRTrDdO.png",
    color: fromHex("#679B9B"),
    generateEmbed: async (guild: Guild) => {
      const fields = [];
      for (
        const [title, generateCategoryDescription] of Object.entries(categories)
      ) {
        fields.push({
          name: `${bold(title.toUpperCase())}`,
          value: await generateCategoryDescription(guild),
          inline: false,
        });
      }

      return {
        fields: fields,
      };
    },
  },*/
  invite: {
    image: "https://i.imgur.com/snJaKYm.png",
    color: fromHex("#637373"),
    generateEmbed: async (guild: Guild) => {
      const invite = await getInvite(guild);
      return {
        title: "INVITE LINK",
        description: bold(invite.link),
      };
    },
  },
};

async function getChannelMention(guild: Guild, name: string): Promise<string> {
  return mention(
    (await findChannelByName(guild, name))!,
    MentionType.CHANNEL,
  );
}

export { getChannelMention };
export default information;
