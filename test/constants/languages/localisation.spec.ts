import { expect } from "chai";
import {
	getDiscordLanguageByLocale,
	getDiscordLocaleByLanguage,
	getLogosLanguageByLocale,
	getLogosLocaleByLanguage,
	isDiscordLanguage,
	isLogosLanguage,
	isLogosLocale,
} from "../../../src/constants/languages/localisation";

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
		expect(isLogosLocale("eng-US")).to.be.true; // American English
	});

	it("returns false if the passed locale is not supported by Logos.", () => {
		expect(isLogosLocale("this-is-not-a-supported-logos-locale")).to.be.false;
	});
});

describe("getDiscordLocaleByLanguage()", () => {
	it("returns the language corresponding to the passed locale.", () => {
		expect(getDiscordLocaleByLanguage("English/American")).to.be("en-US");
		expect(getDiscordLocaleByLanguage("German")).to.be("de");
	});
});

describe("getLogosLocaleByLanguage()", () => {
	it("returns the language corresponding to the passed locale.", () => {
		expect(getLogosLocaleByLanguage("English/American")).to.be("eng");
		expect(getLogosLocaleByLanguage("German")).to.be("deu");
	});
});

describe("getDiscordLanguageByLocale()", () => {
	it("returns the language corresponding to the passed locale if the locale is valid.", () => {
		expect(getDiscordLanguageByLocale("en")).to.be("English");
		expect(getDiscordLanguageByLocale("ro")).to.be("Romanian");
	});

	it("returns undefined if the locale is unsupported or undefined.", () => {
		expect(getDiscordLanguageByLocale("this-is-not-a-supported-discord-locale")).to.be.undefined;
		expect(getDiscordLanguageByLocale(undefined)).to.be.undefined;
	});
});

describe("getLogosLanguageByLocale()", () => {
	it("returns the language corresponding to the passed locale.", () => {
		expect(getLogosLanguageByLocale("eng-US")).to.be("English");
		expect(getLogosLanguageByLocale("ron")).to.be("Romanian");
	});
});
