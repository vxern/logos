import database from "logos:constants/database";
import { expect } from "chai";

describe("The database object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(database)).to.be.true;
	});
});

describe("isValidCollection()", () => {
	// TODO(vxern): Add tests.
});
