import bsd from "../../../src/constants/licences/bsd";

const NOTICE = "this-is-a-sample-passed-copyright-notice";

describe("The generator generates", () => {
	it("parts of the BSD licence that are each no more than 1024 characters long.", () => {
		const parts = bsd(NOTICE);
		expect(parts.every((part) => part.length <= 1024)).toBe(true);
	});

	it("at least one part containing the passed copyright notice.", () => {
		const parts = bsd(NOTICE);
		expect(parts.some((part) => part.includes(NOTICE))).toBe(true);
	});

	it("an array that is immutable.", () => {
		const parts = bsd(NOTICE);
		expect(Object.isFrozen(parts)).toBe(true);
	});
});
