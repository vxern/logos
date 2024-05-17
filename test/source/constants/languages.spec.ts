import { describe, it } from "bun:test";
import { Language, getBaseLanguage, getTranslationLanguage } from "logos:constants/languages";
import { expect } from "chai";

describe("getBaseLanguage()", () => {
	it("returns the base language for an simple language identifier.", () => {
		expect(getBaseLanguage("Polish")).to.equal("Polish");
	});

	it("returns the base language for an extended language identifier.", () => {
		expect(getBaseLanguage("English/American")).to.equal("English");
	});
});

describe("getTranslationLanguage()", () => {
	it("returns the translation language corresponding exactly to the passed language.", () => {
		expect(getTranslationLanguage("Japanese")).to.equal("Japanese");
		expect(getTranslationLanguage("Georgian")).to.equal("Georgian");
	});

	it("returns the translation language corresponding approximately to the passed language, based on its base language.", () => {
		expect(getTranslationLanguage("Armenian/Western")).to.equal("Armenian/Eastern");
		expect([
			"SerboCroatian/Bosnian",
			"SerboCroatian/Croatian",
			"SerboCroatian/Serbian",
		] satisfies Language[]).to.contain(getTranslationLanguage("SerboCroatian/Montenegrin"));
	});

	it("returns the translation language corresponding approximately to the passed language, based on its base language.", () => {
		expect(getTranslationLanguage("Armenian/Western")).to.equal("Armenian/Eastern");
		expect([
			"SerboCroatian/Bosnian",
			"SerboCroatian/Croatian",
			"SerboCroatian/Serbian",
		] satisfies Language[]).to.contain(getTranslationLanguage("SerboCroatian/Montenegrin"));
	});

	it("returns undefined if unable to get a translation language corresponding to the passed language.", () => {
		expect(getTranslationLanguage("Interlingue")).to.be.undefined;
	});
});
