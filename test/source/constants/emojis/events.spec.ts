import { describe, it } from "bun:test";
import events from "logos:constants/emojis/events";
import { expect } from "chai";

describe("The events object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(events)).to.be.true;
	});
});
