import {
	getDeepLLanguageByLocale,
	getDeepLLocaleByLanguage,
	getGoogleTranslateLocaleByLanguage,
	isDeepLLocale,
	isGoogleTranslateLocale,
	isLanguage,
} from "../../../src/constants/languages/translation";

describe("isLanguage()", () => {
	it("returns true if the passed language is a supported translation language.", () => {
		expect(isLanguage("English/American")).toBe(true);
		expect(isLanguage("French")).toBe(true);
	});

	it("returns false if the passed language is not a supported translation language.", () => {
		expect(isLanguage("this-is-not-a-supported-translation-language")).toBe(false);
	});
});

describe("isDeepLLocale()", () => {
	it("returns true if the passed locale is supported by DeepL.", () => {
		expect(isDeepLLocale("BG")).toBe(true); // Bulgarian
		expect(isDeepLLocale("LV")).toBe(true); // Latvian
	});

	it("returns false if the passed locale is not supported by DeepL.", () => {
		expect(isDeepLLocale("this-is-not-a-supported-deepl-locale")).toBe(false);
	});
});

describe("isGoogleTranslateLocale()", () => {
	it("returns true if the passed locale is supported by Google Translate.", () => {
		expect(isGoogleTranslateLocale("sq")).toBe(true); // Albanian
		expect(isGoogleTranslateLocale("hy")).toBe(true); // Armenian
	});

	it("returns false if the passed locale is not supported by Google Translate.", () => {
		expect(isGoogleTranslateLocale("this-is-not-a-supported-google-translate-locale")).toBe(false);
	});
});

describe("getDeepLLocaleByLanguage()", () => {
	it("returns the locale corresponding to the passed DeepL language.", () => {
		expect(getDeepLLocaleByLanguage("Hungarian")).toEqual("HU");
		expect(getDeepLLocaleByLanguage("Swedish")).toEqual("SV");
	});
});

describe("getGoogleTranslateLocaleByLanguage()", () => {
	it("returns the locale corresponding to the passed Google Translate language.", () => {
		expect(getGoogleTranslateLocaleByLanguage("Turkish")).toEqual("tk");
		expect(getGoogleTranslateLocaleByLanguage("Portuguese/Brazilian")).toEqual("pt");
	});
});

describe("getDeepLLanguageByLocale()", () => {
	it("returns the language corresponding to the passed DeepL locale.", () => {
		expect(getDeepLLanguageByLocale("ET")).toEqual("Estonian");
		expect(getDeepLLanguageByLocale("FI")).toEqual("Finnish");
	});
});

describe("getGoogleTranslateLocaleByLanguage()", () => {
	it("returns the locale corresponding to the passed DeepL language.", () => {
		expect(getGoogleTranslateLocaleByLanguage("Danish")).toEqual("da");
		expect(getGoogleTranslateLocaleByLanguage("Indonesian")).toEqual("id");
	});
});
