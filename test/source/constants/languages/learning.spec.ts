import { describe, it } from "bun:test";
import { getWiktionaryLanguageName, isLanguage, isLocale } from "logos:constants/languages/learning";
import { getLogosLocaleByLanguage } from "logos:constants/languages/localisation";
import { expect } from "chai";

describe("isLanguage()", () => {
	it("returns true if the passed language is a supported learning language.", () => {
		expect(isLanguage("Polish")).to.be.true;
		expect(isLanguage("Russian")).to.be.true;
	});

	it("returns false if the passed language is not a supported learning language.", () => {
		expect(isLanguage("this-is-not-a-supported-learning-language")).to.be.false;
	});
});

describe("isLocale()", () => {
	it("returns true if the passed locale is a supported learning locale.", () => {
		expect(isLocale("pol")).to.be.true;
		expect(isLocale("rus")).to.be.true;
	});

	it("returns false if the passed locale is not a supported learning locale.", () => {
		expect(isLocale("this-is-not-a-supported-learning-locale")).to.be.false;
	});
});

describe("getLocaleByLanguage()", () => {
	it("returns the language corresponding to the passed learning locale.", () => {
		expect(getLogosLocaleByLanguage("English/British")).to.equal("eng-GB");
		expect(getLogosLocaleByLanguage("German")).to.equal("deu");
	});
});

describe("getWiktionaryLanguageName()", () => {
	it("returns the Wiktionary name for the learning language if available.", () => {
		expect(getWiktionaryLanguageName("English/British")).to.equal("English");
		expect(getWiktionaryLanguageName("Norwegian/Bokmal")).to.equal("Norwegian Bokmål");
	});
});
