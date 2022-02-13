import { Dictionary, PartialDictionaryEntry, DictionaryScope, DictionaryType, SearchQuery } from '../dictionary.ts';

class Dexonline extends Dictionary {
  scope = DictionaryScope.MONOLINGUAL;
  types = [DictionaryType.DEFINING, DictionaryType.ETYMOLOGICAL];
  languages = ['romanian'];

  query = (query: SearchQuery) => `https://dexonline.ro/definitie/${query.word}/json`;

  async lookup(word: string): Promise<PartialDictionaryEntry> {
    const response = await fetch(this.query({ word }));
    const content = await response.text();
    const data = JSON.parse(content);

    const raw = data.definitions[0].internalRep as string;
    const definition = raw
      .replaceAll(' ** ', ' ⬥ ') // Filled diamond
      .replaceAll(' * ', ' ⬦ ') // Diamond outline
      .replaceAll(
        /%.+?%/g, 
        (match) => match.substring(1, match.length - 1).split('').join(' ')
      ) // Spread letters out
      .replaceAll('#', '__') // Underline
      .replaceAll('@', '**') // Bolden
      .replaceAll('$', '*'); // Italicise

    return { definition: definition };
  }
}

export { Dexonline };