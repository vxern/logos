import time from "../../src/constants/time";

describe("The time object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(time)).toBe(true);
	});
});
