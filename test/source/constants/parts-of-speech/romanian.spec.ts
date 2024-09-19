import { describe, it } from "bun:test";
import romanian from "logos:constants/parts-of-speech/romanian";
import { expect } from "chai";

describe("The romanian object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(romanian)).to.be.true;
	});
});
