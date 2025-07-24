import { describe, it } from "bun:test";
import gifs from "rost:constants/gifs";
import { expect } from "chai";

describe("The gifs object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(gifs)).to.be.true;
	});
});
