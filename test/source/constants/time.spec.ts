import { describe, it } from "bun:test";
import time from "rost:constants/time";
import { expect } from "chai";

describe("The time object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(time)).to.be.true;
	});
});
