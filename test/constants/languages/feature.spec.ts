import { isLanguage } from "../../../src/constants/languages/feature";

describe("isLanguage()", () => {
	it("returns true if the passed language is a supported feature language.", () => {
		expect(isLanguage("Polish")).toBe(true);
		expect(isLanguage("Romanian")).toBe(true);
	});

	it("returns false if the passed language is not a supported feature language.", () => {
		expect(isLanguage("this-is-not-a-supported")).toBe(false);
	});
});
