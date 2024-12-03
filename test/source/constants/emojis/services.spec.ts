import { describe, it } from "bun:test";
import services from "logos:constants/emojis/services";
import { expect } from "chai";

describe("The services object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(services)).to.be.true;
	});
});
