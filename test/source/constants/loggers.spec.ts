import { describe, it } from "bun:test";
import loggers from "logos:constants/loggers";
import { expect } from "chai";

describe("The loggers object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(loggers)).to.be.true;
	});
});
