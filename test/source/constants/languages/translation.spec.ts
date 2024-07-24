import { describe, it } from "bun:test";
import {
	getDeepLLanguageByLocale,
	getDeepLLocaleByLanguage,
	getGoogleTranslateLocaleByLanguage,
	isDeepLLocale,
	isGoogleTranslateLocale,
	isTranslationLanguage,
} from "logos:constants/languages/translation";
import { expect } from "chai";

describe("isLanguage()", () => {
	it("returns true if the passed language is a supported translation language.", () => {
		expect(isTranslationLanguage("English/American")).to.be.true;
		expect(isTranslationLanguage("French")).to.be.true;
	});

	it("returns false if the passed language is not a supported translation language.", () => {
		expect(isTranslationLanguage("this-is-not-a-supported-translation-language")).to.be.false;
	});
});

describe("isDeepLLocale()", () => {
	it("returns true if the passed locale is supported by DeepL.", () => {
		expect(isDeepLLocale("BG")).to.be.true; // Bulgarian
		expect(isDeepLLocale("LV")).to.be.true; // Latvian
	});

	it("returns false if the passed locale is not supported by DeepL.", () => {
		expect(isDeepLLocale("this-is-not-a-supported-deepl-locale")).to.be.false;
	});
});

describe("isGoogleTranslateLocale()", () => {
	it("returns true if the passed locale is supported by Google Translate.", () => {
		expect(isGoogleTranslateLocale("sq")).to.be.true; // Albanian
		expect(isGoogleTranslateLocale("hy")).to.be.true; // Armenian
	});

	it("returns false if the passed locale is not supported by Google Translate.", () => {
		expect(isGoogleTranslateLocale("this-is-not-a-supported-google-translate-locale")).to.be.false;
	});
});

describe("isLingvanexLocale()", () => {
	// TODO(vxern): Implement.
});

describe("getDeepLLocaleByLanguage()", () => {
	it("returns the locale corresponding to the passed DeepL language.", () => {
		expect(getDeepLLocaleByLanguage("Hungarian")).to.equal("HU");
		expect(getDeepLLocaleByLanguage("Swedish")).to.equal("SV");
	});
});

describe("getGoogleTranslateLocaleByLanguage()", () => {
	it("returns the locale corresponding to the passed Google Translate language.", () => {
		expect(getGoogleTranslateLocaleByLanguage("Turkish")).to.equal("tr");
		expect(getGoogleTranslateLocaleByLanguage("Portuguese/Brazilian")).to.equal("pt");
	});
});

describe("getLingvanexLocaleByLanguage()", () => {
	// TODO(vxern): Implement.
});

describe("getDeepLLanguageByLocale()", () => {
	it("returns the language corresponding to the passed DeepL locale.", () => {
		expect(getDeepLLanguageByLocale("ET")).to.equal("Estonian");
		expect(getDeepLLanguageByLocale("FI")).to.equal("Finnish");
	});
});

describe("getGoogleTranslateLanguageByLocale()", () => {
	it("returns the locale corresponding to the passed DeepL language.", () => {
		expect(getGoogleTranslateLocaleByLanguage("Danish")).to.equal("da");
		expect(getGoogleTranslateLocaleByLanguage("Indonesian")).to.equal("id");
	});
});

describe("getLingvanexLanguageByLocale()", () => {
	// TODO(vxern): Implement.
});
