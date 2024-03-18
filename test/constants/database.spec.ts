import { expect } from "chai";
import database from "../../src/constants/database";

describe("The database object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(database)).to.be.true;
	});
});

describe("isValidCollection()", () => {
	// TODO(vxern): Add tests.
});
