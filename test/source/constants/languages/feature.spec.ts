import { describe, it } from "bun:test";
import { isFeatureLanguage } from "logos:constants/languages/feature";
import { expect } from "chai";

describe("isLanguage()", () => {
	it("returns true if the passed language is a supported feature language.", () => {
		expect(isFeatureLanguage("Polish")).to.be.true;
		expect(isFeatureLanguage("Romanian")).to.be.true;
	});

	it("returns false if the passed language is not a supported feature language.", () => {
		expect(isFeatureLanguage("this-is-not-a-supported")).to.be.false;
	});
});
