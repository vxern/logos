import { Dictionary, PartialDictionaryEntry, DictionaryScope, DictionaryType, SearchQuery } from '../dictionary.ts';

class Dexonline extends Dictionary {
  scopes = [DictionaryScope.MONOLINGUAL];
  types = [DictionaryType.DEFINING, DictionaryType.ETYMOLOGICAL];
  languages = ['romanian'];

  query = (query: SearchQuery) => `https://dexonline.ro/definitie/${query.word}/json`;

  async lookup(word: string): Promise<PartialDictionaryEntry> {
    const response = await fetch(this.query({ word }));
    const content = await response.text();
    const data = JSON.parse(content);

    const raw = data.definitions[0].internalRep;
    const definition = raw.replaceAll('#', '__')
      .replaceAll('@', '**')
      .replaceAll('%', '**')
      .replaceAll('$', '*');

    return { definition: definition };
  }
}

export { Dexonline };