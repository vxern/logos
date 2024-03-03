import licences from "../../src/constants/licences";

describe("The licences object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(licences)).toBe(true);
	});
});
