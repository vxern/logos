import { expect } from "chai";
import {
	getCLDLanguageByLocale,
	getTinyLDLanguageByLocale,
	isCLDLocale,
	isTinyLDLocale,
} from "../../../src/constants/languages/detection";

describe("isCLDLocale()", () => {
	it("returns true if the passed locale is supported by CLD.", () => {
		expect(isCLDLocale("pl")).to.be.true;
		expect(isCLDLocale("ro")).to.be.true;
	});

	it("returns false if the passed locale is not supported by CLD.", () => {
		expect(isCLDLocale("this-is-not-a-supported")).to.be.false;
	});
});

describe("isTinyLDLocale()", () => {
	it("returns true if the passed locale is supported by TinyLD.", () => {
		expect(isTinyLDLocale("pol")).to.be.true;
		expect(isTinyLDLocale("ron")).to.be.true;
	});

	it("returns false if the passed locale is not supported by TinyLD.", () => {
		expect(isTinyLDLocale("this-is-not-supported")).to.be.false;
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
