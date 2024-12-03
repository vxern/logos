import { describe, it } from "bun:test";
import flags from "logos:constants/emojis/flags";
import { expect } from "chai";

describe("The flags object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(flags)).to.be.true;
	});
});
