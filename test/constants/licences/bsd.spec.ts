import { expect } from "chai";
import bsd from "../../../src/constants/licences/bsd";

const NOTICE = "this-is-a-sample-passed-copyright-notice";

describe("The generator generates", () => {
	it("parts of the BSD licence that are each no more than 1024 characters long.", () => {
		const parts = bsd(NOTICE);
		for (const part of parts) {
			expect(part.length).to.be.lessThanOrEqual(1024);
		}
	});

	it("at least one part containing the passed copyright notice.", () => {
		const parts = bsd(NOTICE);
		expect(parts.some((part) => part.includes(NOTICE))).to.be.true;
	});

	it("an array that is immutable.", () => {
		const parts = bsd(NOTICE);
		expect(Object.isFrozen(parts)).to.be.true;
	});
});
