import { describe, it } from "bun:test";
import commands from "rost:constants/emojis/commands";
import { expect } from "chai";

describe("The commands object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(commands)).to.be.true;
	});
});
