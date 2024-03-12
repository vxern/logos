import { expect } from "chai";
import { JournallingStore } from "../../src/lib/journalling";
import { mockClient } from "../mocks";

describe("JournallingStore", () => {
	describe("constructor()", () => {
		it("creates an object.", () => {
			expect(() => new JournallingStore(mockClient)).to.not.throw;
		});
	});

	describe("start()", () => {
		// TODO(vxern): Add tests.
	});

	describe("stop()", () => {
		// TODO(vxern): Add tests.
	});

	describe("tryLog()", () => {
		// TODO(vxern): Add tests.
	});
});
