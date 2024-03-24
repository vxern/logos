import time from "logos:constants/time";
import { expect } from "chai";

describe("The time object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(time)).to.be.true;
	});
});
