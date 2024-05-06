import roles from "logos:constants/roles";
import { expect } from "chai";

describe("The roles object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(roles)).to.be.true;
	});
});

describe("isSingle()", () => {
	// TODO(vxern): Test.
});

describe("isGroup()", () => {
	// TODO(vxern): Test.
});

describe("isImplicit()", () => {
	// TODO(vxern): Test.
});

describe("isCustom()", () => {
	// TODO(vxern): Test.
});

describe("getRoleCategories()", () => {
	// TODO(vxern): Test.
});

describe("getRoles()", () => {
	// TODO(vxern): Test.
});
