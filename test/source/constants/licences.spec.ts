import { describe, it } from "bun:test";
import licences from "logos:constants/licences";
import { expect } from "chai";

describe("The licences object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(licences)).to.be.true;
	});
});

describe("isValidDictionary()", () => {
	// TODO(vxern): Test.
});

describe("getDictionaryLicenceByDictionary()", () => {
	// TODO(vxern): Test.
});
