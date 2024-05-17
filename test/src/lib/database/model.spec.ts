import { describe, it } from "bun:test";
import { useDatabaseStore } from "logos:test/dependencies";
import { praise, warning } from "logos:test/helpers";
import { expect } from "chai";
import { IdentifierData, Model } from "logos/database/model";
import { Praise } from "logos/database/praise";
import { Report } from "logos/database/report";
import { Resource } from "logos/database/resource";
import { Suggestion } from "logos/database/suggestion";
import { Warning } from "logos/database/warning";

describe("Model", () => {
	const database = useDatabaseStore();

	describe("buildPartialId()", () => {
		it("returns a partial document ID constructed from the passed data.", () => {
			expect(
				Model.buildPartialId<Warning>({
					guildId: `${0}`,
					authorId: `${123}`,
					targetId: `${456}`,
					createdAt: `${789}`,
				}),
			).to.equal("0/123/456/789");
		});

		it("arranges the properties into a predetermined order, regardless of how they were passed.", () => {
			const PARTIAL_ID = "111/222/333";
			const COMBINATIONS = [
				{ guildId: `${111}`, authorId: `${222}`, createdAt: `${333}` },
				{ guildId: `${111}`, createdAt: `${333}`, authorId: `${222}` },
				{ authorId: `${222}`, guildId: `${111}`, createdAt: `${333}` },
				{ authorId: `${222}`, createdAt: `${333}`, guildId: `${111}` },
				{ createdAt: `${333}`, guildId: `${111}`, authorId: `${222}` },
				{ createdAt: `${333}`, guildId: `${111}`, authorId: `${222}` },
			] satisfies IdentifierData<Report>[];
			for (const combination of COMBINATIONS) {
				expect(Model.buildPartialId<Report>(combination)).to.equal(PARTIAL_ID);
			}
		});

		it("does not include unrecognised ID parts in the result.", () => {
			expect(Model.buildPartialId({ "this-is-an-invalid-id-part": "this-should-be-excluded" })).to.equal("");
		});
	});

	describe("buildId()", () => {
		it("returns a document ID composed of the collection name in camelCase and a partial document ID.", () => {
			expect(
				Model.buildId<Resource>(
					{ guildId: `${123}`, authorId: `${456}`, createdAt: `${789}` },
					{ collection: "Resources" },
				),
			).to.equal("resources/123/456/789");
		});
	});

	describe("getDataFromId()", () => {
		it("decomposes the passed document ID into a collection name and ID parts.", () => {
			expect(Model.getDataFromId<Suggestion>("suggestions/123/456/789")).to.deep.equal([
				"Suggestions",
				[`${123}`, `${456}`, `${789}`],
			]);
		});

		it("throws when the passed document ID belongs to a document in an unsupported collection.", () => {
			expect(() => Model.getDataFromId("unknown/123/456/789")).to.throw(
				`Collection "unknown" encoded in ID "unknown/123/456/789" is unknown.`,
			);
		});
	});

	describe("getDataFromPartialId()", () => {
		it("decomposes the passed partial document ID into ID parts.", () => {
			expect(Model.getDataFromPartialId<Suggestion>("123/456/789")).to.equal([`${123}`, `${456}`, `${789}`]);
		});
	});

	describe("composeId()", () => {
		it("composes the passed partial document ID and collection name into a document ID.", () => {
			expect(Model.composeId("123/456/789", { collection: "Suggestions" })).to.equal("suggestions/123/456/789");
		});
	});

	describe("decomposeId()", () => {
		it("decomposes the passed document ID into a collection name and a partial document ID.", () => {
			expect(Model.decomposeId("suggestions/123/456/789")).to.deep.equal(["Suggestions", "123/456/789"]);
		});
	});

	describe("all()", () => {
		// TODO(vxern): Add tests.
	});

	describe("crossesRateLimit()", () => {
		it("returns true when the creation dates on the documents collectively cross the passed rate limit.", () => {
			expect(
				// These four documents are created now.
				// The rate limit accepts 3 uses within the last hour, meaning the rate limit would be triggered here.
				Model.crossesRateLimit<Praise>(
					[praise(database()), praise(database()), praise(database()), praise(database())],
					{ uses: 3, within: [1, "hour"] },
				),
			).to.be.true;
		});

		it("returns false when the creation dates on the documents does not collectively cross the passed rate limit.", () => {
			expect(
				// These four documents have been created a day ago.
				// The rate limit accepts 3 uses within the last hour, but all of the documents are far beyond that mark,
				// so the rate limit would not be triggered here.
				Model.crossesRateLimit<Warning>(
					[
						warning(database(), { createdAt: `${Date.now() - constants.time.day}` }),
						warning(database(), { createdAt: `${Date.now() - constants.time.day}` }),
						warning(database(), { createdAt: `${Date.now() - constants.time.day}` }),
						warning(database(), { createdAt: `${Date.now() - constants.time.day}` }),
					],
					{ uses: 3, within: [1, "hour"] },
				),
			).to.be.false;
		});
	});
});

describe("getDatabase()", () => {
	// TODO(vxern): Add tests.
});
