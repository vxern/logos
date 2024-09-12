import { describe, it } from "bun:test";
import { type TimeUnit, timeStructToMilliseconds } from "logos:constants/time";
import { useDatabaseStore } from "logos:test/dependencies";
import { expect } from "chai";
import { Guild } from "logos/models/guild";

describe("Guild", () => {
	const database = useDatabaseStore();

	describe("partialId()", () => {
		it("returns the expected partial ID.", () => {
			const model = new Guild(database(), { guildId: `${123}` });
			expect(model.partialId).to.equal("123");
		});
	});

	describe("idParts()", () => {
		it("returns the expected decoded ID parts.", () => {
			const model = new Guild(database(), { guildId: `${123}` });
			expect(model.idParts).to.deep.equal([`${123}`]);
		});
	});

	// TODO(vxern): Test `collection`, `revision`, `isDeleted`.

	describe("guildId()", () => {
		it("returns the ID of the guild the document is for.", () => {
			const model = new Guild(database(), { guildId: `${123}` });
			expect(model.guildId).to.equal(`${123}`);
		});
	});

	describe("get()", () => {
		// TODO(vxern): Add tests.
	});

	describe("create()", () => {
		// TODO(vxern): Add tests.
	});

	describe("getOrCreate()", () => {
		// TODO(vxern): Add tests.
	});

	describe("update()", () => {
		// TODO(vxern): Add tests.
	});

	describe("delete()", () => {
		// TODO(vxern): Add tests.
	});

	describe("hasEnabled()", () => {
		it("returns true when the specified feature is enabled.", () => {
			const model = new Guild(database(), {
				guildId: `${123}`,
			});
			model.enabledFeatures.journalling = true;
			expect(model.hasEnabled("journalling")).to.be.true;
		});

		it("returns false when the specified feature is disabled.", () => {
			const model = new Guild(database(), { guildId: `${123}` });
			expect(model.hasEnabled("journalling")).to.be.false;
		});
	});

	describe("feature()", () => {
		it("throws an exception when the feature is not enabled.", () => {
			const model = new Guild(database(), { guildId: `${123}` });
			expect(() => model.feature("journalling")).to.throw(
				"Attempted to get guild feature 'journalling' that was not enabled on guild with ID 123.",
			);
		});

		it("throws an exception when the feature is not configured.", () => {
			const model = new Guild(database(), { guildId: `${123}` });
			model.enabledFeatures.journalling = true;
			expect(() => model.feature("journalling")).to.throw(
				"Guild feature 'journalling' is enabled on guild with ID 123, but missing a configuration.",
			);
		});

		it("returns the configuration object for the feature.", () => {
			const model = new Guild(database(), { guildId: `${123}` });
			model.enabledFeatures.journalling = true;
			model.features.journalling = {
				channelId: `${123}`,
			};
			expect(model.feature("journalling")).to.deep.equal({ channelId: `${123}` });
		});
	});

	describe("isJournalled()", () => {
		it("returns true when the specified feature is journalled.", () => {
			const model = new Guild(database(), {
				guildId: `${123}`,
			});
			model.enabledFeatures.journalling = true;
			expect(model.hasEnabled("journalling")).to.be.true;
		});

		it("returns false when the specified feature is disabled.", () => {
			const model = new Guild(database(), { guildId: `${123}` });
			expect(model.hasEnabled("journalling")).to.be.false;
		});
	});

	describe("isTargetLanguageOnlyChannel()", () => {
		it("returns true when target-only channels are configured and the passed channel ID is defined as one.", () => {
			const model = new Guild(database(), {
				guildId: `${123}`,
			});
			model.enabledFeatures.targetOnly = true;
			model.features.targetOnly = {
				channelIds: [`${456}`],
			};
			expect(model.isTargetLanguageOnlyChannel(`${456}`)).to.be.true;
		});

		it("returns false when target-only channels are not configured or the passed channel ID is not defined as one.", () => {
			const model = new Guild(database(), { guildId: `${123}` });
			expect(model.isTargetLanguageOnlyChannel(`${456}`)).to.be.false;
		});
	});
});

describe("timeStructToMilliseconds", () => {
	it("gets the number of milliseconds the time struct represents.", () => {
		for (const [unit, duration] of Object.entries(constants.time) as [TimeUnit, number][]) {
			expect(timeStructToMilliseconds([1, unit])).to.equal(duration);
		}

		// Verify the quantity is taken into account.
		expect(timeStructToMilliseconds([10, "second"])).to.equal(10 * constants.time.second);
	});
});
