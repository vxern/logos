import { Command } from '../../commands/command.ts';
import { Dictionary, DictionaryScope } from './data/dictionary.ts';
import resources from './commands/resources.ts';
import word from './commands/word.ts';
import { Client } from '../../client.ts';

const commands: Record<string, Command> = {
	resources,
	word,
};

const languages: Record<string, Dictionary[]> = {};

async function loadDictionaries(): Promise<void> {
	for (const language of Client.languages.values()) {
		languages[language] = [];
	}

	for (
		const file of Deno.readDirSync('./src/modules/language/data/dictionaries')
	) {
		const module = await import(`./data/dictionaries/${file.name}`);
		const dictionary = Object.entries(module)[0][1] as { new (): Dictionary };
		const instance = Object.create(new dictionary()) as Dictionary;

		if (instance.scope === DictionaryScope.OMNILINGUAL) {
			for (const language of Object.keys(languages)) {
				languages[language].push(instance);
			}
			continue;
		}

		for (const language of instance.languages!) {
			if (!languages[language]) {
				languages[language] = [];
			}
			languages[language].push(instance);
		}
	}
}

export { languages, loadDictionaries };
export default commands;
