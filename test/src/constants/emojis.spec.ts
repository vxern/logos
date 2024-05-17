import { describe, it } from "bun:test";
import emojis from "logos:constants/emojis";
import { expect } from "chai";

describe("The emojis object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(emojis)).to.be.true;
	});
});
