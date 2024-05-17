import { describe, it } from "bun:test";
import { expect } from "chai";

describe("Array.prototype.toChunked()", () => {
	it("gets the chunked result.", () => {
		expect(["a", "b", "c"].toChunked(1)).to.deep.equal([["a"], ["b"], ["c"]]);
	});
});

describe("Object.mirror()", () => {
	it("returns an empty object when an empty object is passed.", () => {
		expect(Object.mirror({})).to.deep.equal({});
	});

	it("returns an object with the keys and values swapped.", () => {
		expect(Object.mirror({ one: "1", two: "2" })).to.deep.equal({ "1": "one", "2": "two" });
	});

	it("overrides properties if there are duplicate values with the last encountered instance of that value.", () => {
		expect(Object.mirror({ fruit: "tomato", vegetable: "tomato" })).to.deep.equal({ tomato: "vegetable" });
	});
});

describe("Promise.createRace()", () => {
	it("performs an action on the passed elements, yielding promises that resolve in order of the earliest completed actions.", async () => {
		// We pass in an array containing numbers in a random order.
		// These numbers will be used for simulating a delay, where the lowest number implies the lowest delay, meaning the earliest completion.
		const numbers = [5, 1, 8, 4, 3, 7, 6, 2, 10, 9];
		const iterator = Promise.createRace<number, number>(
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
