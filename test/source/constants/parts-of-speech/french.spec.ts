import { describe, it } from "bun:test";
import french from "logos:constants/parts-of-speech/french";
import { expect } from "chai";

describe("The french object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(french)).to.be.true;
	});
});
