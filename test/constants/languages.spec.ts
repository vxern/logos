import { Language, getBaseLanguage, getTranslationLanguage } from "../../src/constants/languages";

describe("getBaseLanguage()", () => {
	it("returns the base language for an simple language identifier.", () => {
		expect(getBaseLanguage("Polish")).toBe("Polish");
	});

	it("returns the base language for an extended language identifier.", () => {
		expect(getBaseLanguage("English/American")).toBe("English");
	});
});

describe("getTranslationLanguage()", () => {
	it("returns the translation language corresponding exactly to the passed language.", () => {
		expect(getTranslationLanguage("Japanese")).toBe("Japanese");
		expect(getTranslationLanguage("Georgian")).toBe("Georgian");
	});

	it("returns the translation language corresponding approximately to the passed language, based on its base language.", () => {
		expect(getTranslationLanguage("Armenian/Western")).toBe("Armenian/Eastern");
		expect(["SerboCroatian/Bosnian", "SerboCroatian/Croatian", "SerboCroatian/Serbian"] satisfies Language[]).toContain(
			getTranslationLanguage("SerboCroatian/Montenegrin"),
		);
	});

	it("returns the translation language corresponding approximately to the passed language, based on its base language.", () => {
		expect(getTranslationLanguage("Armenian/Western")).toBe("Armenian/Eastern");
		expect(["SerboCroatian/Bosnian", "SerboCroatian/Croatian", "SerboCroatian/Serbian"] satisfies Language[]).toContain(
			getTranslationLanguage("SerboCroatian/Montenegrin"),
		);
	});

	it("returns undefined if unable to get a translation language corresponding to the passed language.", () => {
		expect(getTranslationLanguage("Interlingue")).toBe(undefined);
	});
});
