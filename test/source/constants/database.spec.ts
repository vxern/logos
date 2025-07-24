import { describe, it } from "bun:test";
import database from "rost:constants/database";
import { expect } from "chai";

describe("The database object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(database)).to.be.true;
	});
});

describe("isValidCollection()", () => {
	// TODO(vxern): Add tests.
});
