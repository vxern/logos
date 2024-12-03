import { describe, it } from "bun:test";
import commands from "logos:constants/emojis/commands";
import { expect } from "chai";

describe("The commands object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(commands)).to.be.true;
	});
});
