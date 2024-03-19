import { expect } from "chai";
import patterns from "../../src/constants/patterns";

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
