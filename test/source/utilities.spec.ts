import { describe, it } from "bun:test";
import { chunk, isDefined } from "logos:core/utilities";
import { expect } from "chai";

describe("chunk()", () => {
	it("yields an empty array if the array is empty, returning.", () => {
		const iterator = chunk([], 2);
		expect(iterator.next().value).to.deep.equal([]);
		expect(iterator.next().done).to.be.true;
	});

	it("throws when the chunk size is specified as zero.", () => {
		expect(() => chunk(["a", "b"], 0).next()).to.throw("ArgumentError: The size of a chunk cannot be zero.");
	});

	it("chunks the array when the number of items is less than the chunk size, returning.", () => {
		const iterator = chunk(["a", "b"], 5);
		expect(iterator.next().value).to.deep.equal(["a", "b"]);
		expect(iterator.next().done).to.be.true;
	});

	it("chunks the array when the number of items is equal to the chunk size, returning.", () => {
		const iterator = chunk(["a", "b"], 2);
		expect(iterator.next().value).to.deep.equal(["a", "b"]);
		expect(iterator.next().done).to.be.true;
	});

	it("chunks the array when the number of items is larger than the chunk size, returning.", () => {
		const iterator = chunk(["a", "b", "c"], 1);
		expect(iterator.next().value).to.deep.equal(["a"]);
		expect(iterator.next().value).to.deep.equal(["b"]);
		expect(iterator.next().value).to.deep.equal(["c"]);
		expect(iterator.next().done).to.be.true;
	});
});

describe("isDefined()", () => {
	it("returns true if not undefined.", () => {
		expect(isDefined("defined")).to.be.true;
	});

	it("returns false if undefined.", () => {
		expect(isDefined(undefined)).to.be.false;
	});
});
