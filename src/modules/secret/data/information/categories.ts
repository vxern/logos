import { Guild } from "../../../../../deps.ts";
import { Client } from "../../../../client.ts";
import { getChannelMention } from "./information.ts";

interface Categories {
  [key: string]: (guild: Guild) => Promise<string>;
}

const categories: Categories = {
  information: async (guild: Guild) => {
    const mentions = await getChannelMentions(guild, [
      "rules",
      "announcements",
      "introductions",
    ]);
    return `Meta channels which provide information about the server itself as well as its members. The server's ${
      mentions[0]
    }, ${mentions[1]} and member ${mentions[2]} are found here.`;
  },
  discussion: async (guild: Guild) => {
    const language = Client.getLanguage(guild);
    if (!language) {
      return "This description generator requires an established language.";
    }
    const mentions = await getChannelMentions(guild, [
      "discussion",
      language,
      "other-languages",
    ]);
    return `Core discussion channels for language-related conversations and debates in English (${
      mentions[0]
    }), ${mentions[1]} or in ${mentions[2]}.`;
  },
  education: async (guild: Guild) => {
    const mentions = await getChannelMentions(guild, [
      "resources",
      "classroom",
    ]);
    return `Channels dedicated to the teaching of the language. The ${
      mentions[0]
    } and the ${mentions[1]} channels are contained here.`;
  },
  miscellaneous: async (guild: Guild) => {
    const mentions = await getChannelMentions(guild, [
      "history",
      "music",
      "memes",
    ]);
    return `Topics which do not concern the teaching of the language, but ones which members may enjoy speaking about and sharing, such as ${
      mentions[0]
    }, ${mentions[1]} and ${mentions[2]}.`;
  },
};

async function getChannelMentions(
  guild: Guild,
  channelNames: string[],
): Promise<string[]> {
  const mentionsGenerators = channelNames.map((channel) =>
    getChannelMention(guild, channel)
  );
  const mentions = await Promise.all(mentionsGenerators);
  return mentions;
}

export default categories;
