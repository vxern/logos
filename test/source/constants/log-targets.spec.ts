import { describe, it } from "bun:test";
import { expect } from "chai";
import logTargets from "logos:constants/log-targets.ts";

describe("The logTargets object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(logTargets)).to.be.true;
	});
});
