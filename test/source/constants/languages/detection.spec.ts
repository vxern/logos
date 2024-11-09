import { describe, it } from "bun:test";
import {
	getCLDLanguageByLocale,
	getELDLanguageByLocale,
	getFastTextLanguageByLocale,
	getTinyLDLanguageByLocale,
	isCLDLocale,
	isELDLocale,
	isFastTextLocale,
	isTinyLDLocale,
} from "logos:constants/languages/detection";
import { expect } from "chai";

describe("isCLDLocale()", () => {
	it("returns true if the passed locale is supported by CLD.", () => {
		expect(isCLDLocale("pl")).to.be.true; // Polish
		expect(isCLDLocale("ro")).to.be.true; // Romanian
	});

	it("returns false if the passed locale is not supported by CLD.", () => {
		expect(isCLDLocale("this-is-not-supported")).to.be.false;
	});
});

describe("isTinyLDLocale()", () => {
	it("returns true if the passed locale is supported by TinyLD.", () => {
		expect(isTinyLDLocale("pol")).to.be.true; // Polish
		expect(isTinyLDLocale("ron")).to.be.true; // Romanian
	});

	it("returns false if the passed locale is not supported by TinyLD.", () => {
		expect(isTinyLDLocale("this-is-not-supported")).to.be.false;
	});
});

describe("isFastTextLocale()", () => {
	it("returns true if the passed locale is supported by FastTest.", () => {
		expect(isFastTextLocale("mon")).to.be.true; // Mongolian
		expect(isFastTextLocale("bod")).to.be.true; // Tibetan
	});

	it("returns false if the passed locale is not supported by FastText.", () => {
		expect(isFastTextLocale("this-is-not-supported")).to.be.false;
	});
});

describe("isELDLocale()", () => {
	it("returns true if the passed locale is supported by ELD.", () => {
		expect(isELDLocale("pa")).to.be.true; // Punjabi
		expect(isELDLocale("te")).to.be.true; // Telugu
	});

	it("returns false if the passed locale is not supported by ELD.", () => {
		expect(isELDLocale("this-is-not-supported")).to.be.false;
	});
});

describe("getCLDLanguageByLocale()", () => {
	it("returns the detection language corresponding to the passed locale.", () => {
		expect(getCLDLanguageByLocale("pl")).to.equal("Polish");
		expect(getCLDLanguageByLocale("ro")).to.equal("Romanian");
	});
});

describe("getTinyLDLanguageByLocale()", () => {
	it("returns the detection language corresponding to the passed locale.", () => {
		expect(getTinyLDLanguageByLocale("pol")).to.equal("Polish");
		expect(getTinyLDLanguageByLocale("ron")).to.equal("Romanian");
	});
});

describe("getFastTextLanguageByLocale()", () => {
	it("returns the detection language corresponding to the passed locale.", () => {
		expect(getFastTextLanguageByLocale("mon")).to.equal("Mongolian");
		expect(getFastTextLanguageByLocale("bod")).to.equal("Tibetan");
	});
});

describe("getELDLanguageByLocale()", () => {
	it("returns the detection language corresponding to the passed locale.", () => {
		expect(getELDLanguageByLocale("pa")).to.equal("Punjabi");
		expect(getELDLanguageByLocale("te")).to.equal("Telugu");
	});
});
