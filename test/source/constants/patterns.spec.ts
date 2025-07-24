import { describe, it } from "bun:test";
import patterns from "rost:constants/patterns";
import { expect } from "chai";

describe("The patterns object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(patterns)).to.be.true;
	});
});

describe("isValidSnowflake()", () => {
	// TODO(vxern): Test.
});

describe("getSnowflakeFromIdentifier()", () => {
	// TODO(vxern): Test.
});
