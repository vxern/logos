import { Interaction, InteractionApplicationCommandData, InteractionResponseType } from "../../../../deps.ts";
import { Client } from "../../../client.ts";
import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";
import { OptionType } from "../../../commands/option.ts";
import { capitalise } from "../../../formatting.ts";
import { fromHex } from "../../../utils.ts";
import { DictionaryEntry, toFields } from "../data/dictionary.ts";
import { languages } from "../module.ts";

const command: Command = {
  name: "word",
  availability: Availability.MEMBERS,
  description: "Looks up a word in a dictionary.",
  options: [{
    name: "word",
    description: "The word too look up.",
    required: true,
    type: OptionType.STRING,
  }, {
    name: "verbose",
    description: "If set to true, the dictionary entry will be displayed in a more verbose format.",
    type: OptionType.BOOLEAN,
  }, {
    name: "show",
    description: "If set to true, the dictionary entry will be shown to other users.",
    type: OptionType.BOOLEAN,
  }],
  handle: word,
};

async function word(interaction: Interaction): Promise<void> {
  const data = interaction.data! as InteractionApplicationCommandData;
  const word = data.options[0].value! as string;
  const verbose = data.options.find((option) => option.name === "verbose")?.value ?? true;
  const show = data.options.find((option) => option.name === "show")?.value ?? false;

  const response = await interaction.respond({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE,
    ephemeral: !show
  });

  const language = Client.getLanguage(interaction.guild!) || 'romanian';

  console.log(`${interaction.user.username} is looking up a word '${word}' in ${capitalise(language)}.`);

  let entry: DictionaryEntry = {headword: word}; 

  Object.values(languages[language]).map((dictionary) => dictionary.lookup(word, language).then((result) => {
    entry = {...result, ...entry};

    const fields = toFields(entry, {verbose: verbose});

    response.editResponse({
      embeds: [{
        title: entry.headword,
        description: fields.length === 0 ? `No results found for '${entry.headword}'.` : undefined,
        fields: fields,
        color: fromHex("#d6e3f8"),
      }],
    });
  }));
}

export default command;