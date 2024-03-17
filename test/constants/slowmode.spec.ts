import { expect } from "chai";
import slowmode from "../../src/constants/slowmode";

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
