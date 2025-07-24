import { describe, it } from "bun:test";
import defaults from "rost:constants/defaults";
import { expect } from "chai";

describe("The defaults object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(defaults)).to.be.true;
	});
});
