import { expect } from "chai";
import links from "../../src/constants/links";

const STRING_UNENCODED = "1 2 3";
const STRING_ENCODED = "1%202%203";

describe("The links object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(links)).to.be.true;
	});

	it("generates links that are URI-encoded.", () => {
		expect(links.tatoebaSentence(STRING_UNENCODED)).to.be(`https://tatoeba.org/en/sentences/show/${STRING_ENCODED}`);
		expect(links.dexonlineDefinition(STRING_UNENCODED)).to.be(`https://dexonline.ro/definitie/${STRING_ENCODED}`);
		expect(links.wiktionaryDefinition(STRING_UNENCODED, STRING_UNENCODED)).to.be(
			`https://en.wiktionary.org/wiki/${STRING_UNENCODED}#${STRING_UNENCODED}`,
		);
		expect(links.wordsAPIDefinition()).to.be("https://wordsapi.com");
		expect(links.dicolinkDefinition(STRING_UNENCODED)).to.be(`https://dicolink.com/mots/${STRING_ENCODED}`);
	});
});
