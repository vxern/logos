import { describe, it } from "bun:test";
import lengths from "rost:constants/lengths";
import { expect } from "chai";

describe("The lengths object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(lengths)).to.be.true;
	});
});
