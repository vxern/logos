import properties from "../../src/constants/properties";

describe("The properties object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(properties)).toBe(true);
	});
});
