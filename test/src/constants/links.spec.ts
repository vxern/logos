import { describe, it } from "bun:test";
import links from "logos:constants/links";
import { expect } from "chai";

const STRING_UNENCODED = "1 2 3";
const STRING_ENCODED = "1%202%203";

describe("The links object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(links)).to.be.true;
	});

	it("generates links that are URI-encoded.", () => {
		expect(links.tatoebaSentence(STRING_UNENCODED)).to.equal(
			`https://tatoeba.org/en/sentences/show/${STRING_ENCODED}`,
		);
		expect(links.dexonlineDefinition(STRING_UNENCODED)).to.equal(
			`https://dexonline.ro/definitie/${STRING_ENCODED}`,
		);
		expect(links.wiktionaryDefinition(STRING_UNENCODED, STRING_UNENCODED)).to.equal(
			`https://en.wiktionary.org/wiki/${STRING_ENCODED}#${STRING_ENCODED}`,
		);
		expect(links.wordsAPIDefinition()).to.equal("https://wordsapi.com");
		expect(links.dicolinkDefinition(STRING_UNENCODED)).to.equal(`https://dicolink.com/mots/${STRING_ENCODED}`);
	});
});
