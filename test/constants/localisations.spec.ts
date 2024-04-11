import localisations from "logos:constants/localisations";
import { expect } from "chai";

describe("The localisations object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(localisations)).to.be.true;
	});

	describe("contains a language localisations object where", () => {
		it("every key starts with 'languages.'.", () => {
			for (const key of Object.values(localisations.languages)) {
				expect(key.startsWith("languages.")).to.be.true;
			}
		});
	});
});
