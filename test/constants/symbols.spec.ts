import symbols from "../../src/constants/symbols";

describe("The symbols object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(symbols)).toBe(true);
	});
});
