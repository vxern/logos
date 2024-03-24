import { mockClient } from "logos:test/mocks";
import { expect } from "chai";
import { JournallingStore } from "logos/stores/journalling";

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
