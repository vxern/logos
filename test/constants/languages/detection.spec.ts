import {
	getCLDLanguageByLocale,
	getTinyLDLanguageByLocale,
	isCLDLocale,
	isTinyLDLocale,
} from "../../../src/constants/languages/detection";

describe("isCLDLocale()", () => {
	it("returns true if the passed locale is supported by CLD.", () => {
		expect(isCLDLocale("pl")).toBe(true);
		expect(isCLDLocale("ro")).toBe(true);
	});

	it("returns false if the passed locale is not supported by CLD.", () => {
		expect(isCLDLocale("this-is-not-a-supported")).toBe(false);
	});
});

describe("isTinyLDLocale()", () => {
	it("returns true if the passed locale is supported by TinyLD.", () => {
		expect(isTinyLDLocale("pol")).toBe(true);
		expect(isTinyLDLocale("ron")).toBe(true);
	});

	it("returns false if the passed locale is not supported by TinyLD.", () => {
		expect(isTinyLDLocale("this-is-not-supported")).toBe(false);
	});
});

describe("getCLDLanguageByLocale()", () => {
	it("returns the detection language corresponding to the passed locale.", () => {
		expect(getCLDLanguageByLocale("pl")).toEqual("Polish");
		expect(getCLDLanguageByLocale("ro")).toEqual("Romanian");
	});
});

describe("getTinyLDLanguageByLocale()", () => {
	it("returns the detection language corresponding to the passed locale.", () => {
		expect(getTinyLDLanguageByLocale("pol")).toEqual("Polish");
		expect(getTinyLDLanguageByLocale("ron")).toEqual("Romanian");
	});
});
