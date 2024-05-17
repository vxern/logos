import { describe, it } from "bun:test";
import endpoints from "logos:constants/endpoints";
import { expect } from "chai";

describe("The endpoints object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(endpoints)).to.be.true;
	});
});
