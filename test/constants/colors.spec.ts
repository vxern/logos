import colors, { fromHex } from "../../src/constants/colors";

describe("fromHex()", () => {
	it("throws an exception if the passed string is not in the correct format.", () => {
		expect(() => fromHex("this-is-not-correct")).toThrow("The passed colour was not in the correct format (#ffffff).");
	});

	it("converts a hexadecimal colour code to its decimal representation.", () => {
		expect(fromHex("#000000")).toEqual(0);
		expect(fromHex("#ffffff")).toEqual(16777215);
	});
});

describe("The colors object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(colors)).toBe(true);
	});
});
