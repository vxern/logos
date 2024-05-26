import { describe, it } from "bun:test";
import { isLanguage, isLocale } from "logos:constants/languages/learning";
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
	// TODO(vxern): Implement.
});

describe("getWiktionaryLanguageName()", () => {
	// TODO(vxern): Implement.
});
