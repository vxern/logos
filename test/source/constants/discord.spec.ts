import { describe, it } from "bun:test";
import discord from "logos:constants/discord";
import { expect } from "chai";

describe("The discord object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(discord)).to.be.true;
	});
});
