import links from "../../src/constants/links";

const STRING_UNENCODED = "1 2 3";
const STRING_ENCODED = "1%202%203";

describe("The links object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(links)).toBe(true);
	});

	it("generates links that are URI-encoded.", () => {
		expect(links.tatoebaSentence(STRING_UNENCODED)).toBe(`https://tatoeba.org/en/sentences/show/${STRING_ENCODED}`);
		expect(links.dexonlineDefinition(STRING_UNENCODED)).toBe(`https://dexonline.ro/definitie/${STRING_ENCODED}`);
		expect(links.wiktionaryDefinition(STRING_UNENCODED, STRING_UNENCODED)).toBe(
			`https://en.wiktionary.org/wiki/${STRING_UNENCODED}#${STRING_UNENCODED}`,
		);
		expect(links.wordsAPIDefinition()).toBe("https://wordsapi.com");
		expect(links.dicolinkDefinition(STRING_UNENCODED)).toBe(`https://dicolink.com/mots/${STRING_ENCODED}`);
	});
});
