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
		expect(isDiscordLanguage("English/American")).toBe(true);
		expect(isDiscordLanguage("French")).toBe(true);
	});

	it("returns false if the passed language is not a supported Discord language.", () => {
		expect(isDiscordLanguage("this-is-not-a-supported-discord-language")).toBe(false);
	});
});

describe("isLogosLanguage()", () => {
	it("returns true if the passed language is a supported Logos language.", () => {
		expect(isLogosLanguage("German")).toBe(true);
		expect(isLogosLanguage("Dutch")).toBe(true);
	});

	it("returns false if the passed language is not a supported Logos language.", () => {
		expect(isLogosLanguage("this-is-not-a-supported-logos-language")).toBe(false);
	});
});

describe("isLogosLocale()", () => {
	it("returns true if the passed locale is supported by Logos.", () => {
		expect(isLogosLocale("eng-US")).toBe(true); // American English
	});

	it("returns false if the passed locale is not supported by Logos.", () => {
		expect(isLogosLocale("this-is-not-a-supported-logos-locale")).toBe(false);
	});
});

describe("getDiscordLocaleByLanguage()", () => {
	it("returns the language corresponding to the passed locale.", () => {
		expect(getDiscordLocaleByLanguage("English/American")).toEqual("en-US");
		expect(getDiscordLocaleByLanguage("German")).toEqual("de");
	});
});

describe("getLogosLocaleByLanguage()", () => {
	it("returns the language corresponding to the passed locale.", () => {
		expect(getLogosLocaleByLanguage("English/American")).toEqual("eng");
		expect(getLogosLocaleByLanguage("German")).toEqual("deu");
	});
});

describe("getDiscordLanguageByLocale()", () => {
	it("returns the language corresponding to the passed locale if the locale is valid.", () => {
		expect(getDiscordLanguageByLocale("en")).toEqual("English");
		expect(getDiscordLanguageByLocale("ro")).toEqual("Romanian");
	});

	it("returns undefined if the locale is unsupported or undefined.", () => {
		expect(getDiscordLanguageByLocale("this-is-not-a-supported-discord-locale")).toEqual(undefined);
		expect(getDiscordLanguageByLocale(undefined)).toEqual(undefined);
	});
});

describe("getLogosLanguageByLocale()", () => {
	it("returns the language corresponding to the passed locale.", () => {
		expect(getLogosLanguageByLocale("eng-US")).toEqual("English");
		expect(getLogosLanguageByLocale("ron")).toEqual("Romanian");
	});
});
