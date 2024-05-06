import { mockClient } from "logos:test/mocks";
import { expect } from "chai";
import { EventStore } from "logos/stores/events";

describe("EventStore", () => {
	describe("constructor()", () => {
		it("creates an object.", () => {
			expect(() => new EventStore(mockClient)).to.not.throw;
		});
	});

	describe("dispatchEvent()", () => {
		// TODO(vxern): Add tests.
	});

	describe("registerCollector()", () => {
		// TODO(vxern): Add tests.
	});
});
