import { describe, it } from "bun:test";
import {
	getDiscordLanguageByLocale,
	getDiscordLocaleByLanguage,
	getLogosLanguageByLocale,
	getLogosLocaleByLanguage,
	isDiscordLanguage,
	isLogosLanguage,
	isLogosLocale,
} from "logos:constants/languages/localisation";
import { expect } from "chai";

describe("isDiscordLanguage()", () => {
	it("returns true if the passed language is a supported Discord language.", () => {
		expect(isDiscordLanguage("English/American")).to.be.true;
		expect(isDiscordLanguage("French")).to.be.true;
	});

	it("returns false if the passed language is not a supported Discord language.", () => {
		expect(isDiscordLanguage("this-is-not-a-supported-discord-language")).to.be.false;
	});
});

describe("isLogosLanguage()", () => {
	it("returns true if the passed language is a supported Logos language.", () => {
		expect(isLogosLanguage("German")).to.be.true;
		expect(isLogosLanguage("Dutch")).to.be.true;
	});

	it("returns false if the passed language is not a supported Logos language.", () => {
		expect(isLogosLanguage("this-is-not-a-supported-logos-language")).to.be.false;
	});
});

describe("isLogosLocale()", () => {
	it("returns true if the passed locale is supported by Logos.", () => {
		expect(isLogosLocale("eng-GB")).to.be.true; // British English
	});

	it("returns false if the passed locale is not supported by Logos.", () => {
		expect(isLogosLocale("this-is-not-a-supported-logos-locale")).to.be.false;
	});
});

describe("getDiscordLocaleByLanguage()", () => {
	it("returns the language corresponding to the passed locale.", () => {
		expect(getDiscordLocaleByLanguage("English/British")).to.equal("en-GB");
		expect(getDiscordLocaleByLanguage("German")).to.equal("de");
	});
});

describe("getLogosLocaleByLanguage()", () => {
	it("returns the language corresponding to the passed locale.", () => {
		expect(getLogosLocaleByLanguage("English/British")).to.equal("eng-GB");
		expect(getLogosLocaleByLanguage("German")).to.equal("deu");
	});
});

describe("getDiscordLanguageByLocale()", () => {
	it("returns the language corresponding to the passed locale if the locale is valid.", () => {
		expect(getDiscordLanguageByLocale("en-GB")).to.equal("English/British");
		expect(getDiscordLanguageByLocale("ro")).to.equal("Romanian");
	});

	it("returns undefined if the locale is unsupported or undefined.", () => {
		expect(getDiscordLanguageByLocale("this-is-not-a-supported-discord-locale")).to.be.undefined;
		expect(getDiscordLanguageByLocale(undefined)).to.be.undefined;
	});
});

describe("getLogosLanguageByLocale()", () => {
	it("returns the language corresponding to the passed locale.", () => {
		expect(getLogosLanguageByLocale("eng-GB")).to.equal("English/British");
		expect(getLogosLanguageByLocale("ron")).to.equal("Romanian");
	});
});
