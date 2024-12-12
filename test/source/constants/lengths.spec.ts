import { describe, it } from "bun:test";
import lengths from "logos:constants/lengths";
import { expect } from "chai";

describe("The lengths object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(lengths)).to.be.true;
	});
});
