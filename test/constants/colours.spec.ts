import colours, { fromHex } from "logos:constants/colours";
import { expect } from "chai";

describe("fromHex()", () => {
	it("throws an exception if the passed string is not in the correct format.", () => {
		expect(() => fromHex("this-is-not-correct")).to.throw("The passed colour was not in the correct format (#ffffff).");
	});

	it("converts a hexadecimal colour code to its decimal representation.", () => {
		expect(fromHex("#000000")).to.equal(0);
		expect(fromHex("#ffffff")).to.equal(16777215);
	});
});

describe("The colors object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(colours)).to.be.true;
	});
});
