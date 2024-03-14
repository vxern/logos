import { expect } from "chai";
import { mockClient, mockServices } from "../mocks";
import { EventStore } from "../../src/lib/events";

describe("EventStore", () => {
	describe("constructor()", () => {
		it("creates an object.", () => {
			expect(() => new EventStore(mockClient, { services: mockServices })).to.not.throw;
		});
	});

	describe("dispatchEvent()", () => {
		// TODO(vxern): Add tests.
	});

	describe("registerCollector()", () => {
		// TODO(vxern): Add tests.
	});
});
