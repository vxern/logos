import { describe, it } from "bun:test";
import services from "rost:constants/emojis/services";
import { expect } from "chai";

describe("The services object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(services)).to.be.true;
	});
});
