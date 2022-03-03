import { parse } from "https://deno.land/std@0.127.0/encoding/csv.ts";
import { Command } from '../../commands/command.ts';
import { Dictionary, DictionaryScope } from './data/dictionary.ts';
import learn from "./commands/learn.ts";
import resources from './commands/resources.ts';
import word from './commands/word.ts';
import { Client } from '../../client.ts';
import { SentencePair } from "./data/sentence.ts";

const commands: Record<string, Command> = {
  learn,
	resources,
	word,
};

const dictionaryLists: Record<string, Dictionary[]> = {};
const sentenceLists: Record<string, SentencePair[]> = {};

async function loadLanguages(): Promise<void> {
	for (const language of Client.languages.values()) {
		dictionaryLists[language] = [];
	}

	for await (
		const entry of Deno.readDir('./src/modules/language/data/dictionaries')
	) {
		const module = await import(`./data/dictionaries/${entry.name}`);
		const dictionary = Object.entries(module)[0][1] as { new (): Dictionary };
		const instance = Object.create(new dictionary()) as Dictionary;

		if (instance.scope === DictionaryScope.OMNILINGUAL) {
			for (const language of Object.keys(dictionaryLists)) {
				dictionaryLists[language].push(instance);
			}
			continue;
		}

		for (const language of instance.languages!) {
			if (!dictionaryLists[language]) {
				dictionaryLists[language] = [];
			}
			dictionaryLists[language].push(instance);
		}
	}

  for await (const entry of Deno.readDir('./src/modules/language/data/languages')) {
    const language = entry.name.split('.')[0];
    
    const records: string[][] = await parse(
      await Deno.readTextFile(`./src/modules/language/data/languages/${entry.name}`), 
      {
        lazyQuotes: true,
        separator: '\t',
      }
    );

    sentenceLists[language] = [];
    for (const record of records) {
      sentenceLists[language].push({sentence: record[1], translation: record[3]});
    }
  }
}

export { dictionaryLists, sentenceLists, loadLanguages };
export default commands;
