import { describe, it } from "bun:test";
import english from "logos:constants/parts-of-speech/english";
import { expect } from "chai";

describe("The english object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(english)).to.be.true;
	});
});
