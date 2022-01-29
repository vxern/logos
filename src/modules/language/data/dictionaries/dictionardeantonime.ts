import { cheerio } from "../../../../../deps.ts";
import { Dictionary, PartialDictionaryEntry, DictionaryScope, DictionaryType, SearchQuery } from '../dictionary.ts';

class DictionarDeAntonime extends Dictionary {
  scopes = [DictionaryScope.MONOLINGUAL];
  types = [DictionaryType.DEFINING, DictionaryType.SYNONYM];

  query = (query: SearchQuery) => `https://www.dictionardeantonime.ro/?c=${query.word}`;

  async lookup(word: string): Promise<PartialDictionaryEntry> {
    const response = await fetch(this.query({ word }));
    const content = await response.text();
    const $ = cheerio.load(content);

    const definition = $('#content > div.content_page_simple > span').text();

    return {
      antonyms: [definition]
    };
  }
}

export { DictionarDeAntonime };