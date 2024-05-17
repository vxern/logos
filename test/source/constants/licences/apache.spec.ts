import { describe, it } from "bun:test";
import apache from "logos:constants/licences/apache";
import { expect } from "chai";

const NOTICE = "this-is-a-sample-passed-copyright-notice";

describe("The generator generates", () => {
	it("parts of the Apache licence that are each no more than 4096 characters long.", () => {
		const parts = apache(NOTICE);
		for (const part of parts) {
			expect(part.length).to.be.lessThanOrEqual(4096);
		}
	});

	it("at least one part containing the passed copyright notice.", () => {
		const parts = apache(NOTICE);
		expect(parts.some((part) => part.includes(NOTICE))).to.be.true;
	});

	it("an array that is immutable.", () => {
		const parts = apache(NOTICE);
		expect(Object.isFrozen(parts)).to.be.true;
	});
});
