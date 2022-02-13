import { Guild } from "../../../../../deps.ts";
import { getChannelMention } from "./information.ts";

interface Rule {
  summary: string;
  paragraph: string;
}

interface Rules {
  [key: string]: (guild: Guild) => Promise<Rule> | Rule;
}

const rules: Rules = {
  behavior: (_) => {
    return {
      summary: "Try to be nice.",
      paragraph:
        "All members should be treated with respect, consideration and understanding. Abuse, discrimination, harassment and other forms of hurtful or toxic behavior will not be tolerated.",
    };
  },
  quality: async (guild: Guild) => {
    const memesChannel = await getChannelMention(guild, "memes");
    return {
      summary: "Do not troll.",
      paragraph:
        `Contributions made to the server should be of decent quality. Trolling, spamming, flooding, shitposting (outside of the ${memesChannel} channel) and other forms of low-quality and annoying behavior will not be tolerated.`,
    };
  },
  relevance: (_) => {
    return {
      summary: "Post relevant content.",
      paragraph:
        "Contributions made to the server should be placed in their relevant channel and category. Contributions which are made in inappropriate channels will be asked to be moved to their relevant channel.",
    };
  },
  suitability: (_) => {
    return {
      summary: "Post content that is appropriate.",
      paragraph:
        "Contributions made to the server must be suitable for minors. NSFW and NSFL content will not be tolerated.",
    };
  },
  exclusivity: (_) => {
    return {
      summary: "Do not advertise.",
      paragraph:
        "Advertising of other Discord servers is not allowed, and any attempts at advertising (including profile descriptions) will not be tolerated.",
    };
  },
};

export default rules;
