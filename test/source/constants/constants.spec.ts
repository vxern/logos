import { describe, it } from "bun:test";
import constants from "logos:constants/constants";
import { expect } from "chai";

describe("The constants object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(constants)).to.be.true;
	});
});
