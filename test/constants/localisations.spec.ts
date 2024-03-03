import localisations from "../../src/constants/localisations";

describe("The localisations object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(localisations)).toBe(true);
	});

	describe("contains a language localisations object where", () => {
		it("every key starts with 'languages.'.", () => {
			for (const key of Object.values(localisations.languages)) {
				expect(key.startsWith("languages.")).toBe(true);
			}
		});
	});
});
