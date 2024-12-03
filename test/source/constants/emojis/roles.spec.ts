import { describe, it } from "bun:test";
import roles from "logos:constants/emojis/roles";
import { expect } from "chai";

describe("The roles object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(roles)).to.be.true;
	});
});
