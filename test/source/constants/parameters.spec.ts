import { describe, it } from "bun:test";
import parameters from "rost:constants/parameters";
import { expect } from "chai";

describe("The parameters object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(parameters)).to.be.true;
	});
});
