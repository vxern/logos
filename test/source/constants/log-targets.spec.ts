import { describe, it } from "bun:test";
import logTargets from "rost:constants/log-targets";
import { expect } from "chai";

describe("The logTargets object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(logTargets)).to.be.true;
	});
});
