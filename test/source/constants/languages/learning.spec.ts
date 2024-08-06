import { describe, it } from "bun:test";
import { getWiktionaryLanguageName, isLearningLanguage, isLearningLocale } from "logos:constants/languages/learning";
import { getLogosLocaleByLanguage } from "logos:constants/languages/localisation";
import { expect } from "chai";

describe("isLanguage()", () => {
	it("returns true if the passed language is a supported learning language.", () => {
		expect(isLearningLanguage("Polish")).to.be.true;
		expect(isLearningLanguage("Russian")).to.be.true;
	});

	it("returns false if the passed language is not a supported learning language.", () => {
		expect(isLearningLanguage("this-is-not-a-supported-learning-language")).to.be.false;
	});
});

describe("isLocale()", () => {
	it("returns true if the passed locale is a supported learning locale.", () => {
		expect(isLearningLocale("pol")).to.be.true;
		expect(isLearningLocale("rus")).to.be.true;
	});

	it("returns false if the passed locale is not a supported learning locale.", () => {
		expect(isLearningLocale("this-is-not-a-supported-learning-locale")).to.be.false;
	});
});

describe("getLocaleByLanguage()", () => {
	it("returns the language corresponding to the passed learning locale.", () => {
		expect(getLogosLocaleByLanguage("English/American")).to.equal("eng-US");
		expect(getLogosLocaleByLanguage("German")).to.equal("deu");
	});
});

describe("getWiktionaryLanguageName()", () => {
	it("returns the Wiktionary name for the learning language if available.", () => {
		expect(getWiktionaryLanguageName("English/American")).to.equal("English");
		expect(getWiktionaryLanguageName("Norwegian/Bokmal")).to.equal("Norwegian Bokmål");
	});
});
