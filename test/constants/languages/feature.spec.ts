import { expect } from "chai";
import { isLanguage } from "../../../src/constants/languages/feature";

describe("isLanguage()", () => {
	it("returns true if the passed language is a supported feature language.", () => {
		expect(isLanguage("Polish")).to.be.true;
		expect(isLanguage("Romanian")).to.be.true;
	});

	it("returns false if the passed language is not a supported feature language.", () => {
		expect(isLanguage("this-is-not-a-supported")).to.be.false;
	});
});
