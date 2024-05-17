import { describe, it } from "bun:test";
import mit from "logos:constants/licences/mit";
import { expect } from "chai";

const NOTICE = "this-is-a-sample-passed-copyright-notice";

describe("The generator generates", () => {
	it("parts of the MIT licence that are each no more than 4096 characters long.", () => {
		const parts = mit(NOTICE);
		for (const part of parts) {
			expect(part.length).to.be.lessThanOrEqual(4096);
		}
	});

	it("at least one part containing the passed copyright notice.", () => {
		const parts = mit(NOTICE);
		expect(parts.some((part) => part.includes(NOTICE))).to.be.true;
	});

	it("an array that is immutable.", () => {
		const parts = mit(NOTICE);
		expect(Object.isFrozen(parts)).to.be.true;
	});
});
