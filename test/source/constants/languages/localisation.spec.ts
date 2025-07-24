import { describe, it } from "bun:test";
import {
	getDiscordLanguageByLocale,
	getDiscordLocaleByLanguage,
	getRostLanguageByLocale,
	getRostLocaleByLanguage,
	isDiscordLanguage,
	isRostLanguage,
	isRostLocale,
} from "rost:constants/languages/localisation";
import { expect } from "chai";

describe("isDiscordLanguage()", () => {
	it("returns true if the passed language is a supported Discord language.", () => {
		expect(isDiscordLanguage("English/British")).to.be.true;
		expect(isDiscordLanguage("French")).to.be.true;
	});

	it("returns false if the passed language is not a supported Discord language.", () => {
		expect(isDiscordLanguage("this-is-not-a-supported-discord-language")).to.be.false;
	});
});

describe("isRostLanguage()", () => {
	it("returns true if the passed language is a supported Rost language.", () => {
		expect(isRostLanguage("German")).to.be.true;
		expect(isRostLanguage("Dutch")).to.be.true;
	});

	it("returns false if the passed language is not a supported Rost language.", () => {
		expect(isRostLanguage("this-is-not-a-supported-rost-language")).to.be.false;
	});
});

describe("isRostLocale()", () => {
	it("returns true if the passed locale is supported by Rost.", () => {
		expect(isRostLocale("eng-GB")).to.be.true; // British English
	});

	it("returns false if the passed locale is not supported by Rost.", () => {
		expect(isRostLocale("this-is-not-a-supported-rost-locale")).to.be.false;
	});
});

describe("getDiscordLocaleByLanguage()", () => {
	it("returns the language corresponding to the passed locale.", () => {
		expect(getDiscordLocaleByLanguage("English/British")).to.equal("en-GB");
		expect(getDiscordLocaleByLanguage("German")).to.equal("de");
	});
});

describe("getRostLocaleByLanguage()", () => {
	it("returns the language corresponding to the passed locale.", () => {
		expect(getRostLocaleByLanguage("English/British")).to.equal("eng-GB");
		expect(getRostLocaleByLanguage("German")).to.equal("deu");
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

describe("getRostLanguageByLocale()", () => {
	it("returns the language corresponding to the passed locale.", () => {
		expect(getRostLanguageByLocale("eng-GB")).to.equal("English/British");
		expect(getRostLanguageByLocale("ron")).to.equal("Romanian");
	});
});
