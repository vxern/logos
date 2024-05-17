import { describe, it } from "bun:test";
import slowmode from "logos:constants/slowmode";
import { expect } from "chai";

describe("The slowmode object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(slowmode)).to.be.true;
	});
});

describe("isValidSlowmodeLevel", () => {
	// TODO(vxern): Test.
});

describe("getSlowmodeDelayByLevel", () => {
	// TODO(vxern): Test.
});

describe("getSlowmodeLevelByDelay", () => {
	// TODO(vxern): Test.
});
