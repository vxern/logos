import { expect } from "chai";
import { chunk, isDefined, race, reverseObject, toChunked } from "../src/utilities";

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

describe("toChunked()", () => {
	// TODO(vxern): Verify that it delegates the call to `chunk()`.
	it("gets the chunked result.", () => {
		expect(toChunked(["a", "b", "c"], 1)).to.deep.equal([["a"], ["b"], ["c"]]);
	});
});

describe("reverseObject()", () => {
	it("returns an empty object when an empty object is passed.", () => {
		expect(reverseObject({})).to.deep.equal({});
	});

	it("returns an object with the keys and values swapped.", () => {
		expect(reverseObject({ one: "1", two: "2" })).to.deep.equal({ "1": "one", "2": "two" });
	});

	it("overrides properties if there are duplicate values with the last encountered instance of that value.", () => {
		expect(reverseObject({ fruit: "tomato", vegetable: "tomato" })).to.deep.equal({ tomato: "vegetable" });
	});
});

describe("race()", () => {
	it("performs an action on the passed elements, yielding promises that resolve in order of the earliest completed actions.", async () => {
		// We pass in an array containing numbers in a random order.
		// These numbers will be used for simulating a delay, where the lowest number implies the lowest delay, meaning the earliest completion.
		const numbers = [5, 1, 8, 4, 3, 7, 6, 2, 10, 9];
		const iterator = race<number, number>(
			numbers,
			(element) => new Promise<number>((resolve) => setTimeout(() => resolve(element), element * 10)),
		);

		// Then we verify that the numbers do indeed come in the order of earliest completion.
		for (const number of Array(10).keys()) {
			expect((await iterator.next()).value).to.deep.equal({ element: number + 1, result: number + 1 });
		}

		expect((await iterator.next()).done).to.be.true;
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
