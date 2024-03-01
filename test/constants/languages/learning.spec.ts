import { isLanguage, isLocale } from "../../../src/constants/languages/learning";

describe("isLanguage()", () => {
	it("returns true if the passed language is a supported learning language.", () => {
		expect(isLanguage("Polish")).toBe(true);
		expect(isLanguage("Russian")).toBe(true);
	});

	it("returns false if the passed language is not a supported learning language.", () => {
		expect(isLanguage("this-is-not-a-supported-learning-language")).toBe(false);
	});
});

describe("isLocale()", () => {
	it("returns true if the passed locale is a supported learning locale.", () => {
		expect(isLocale("pol")).toBe(true);
		expect(isLocale("rus")).toBe(true);
	});

	it("returns false if the passed locale is not a supported learning locale.", () => {
		expect(isLocale("this-is-not-a-supported-learning-locale")).toBe(false);
	});
});
