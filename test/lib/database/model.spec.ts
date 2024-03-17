import { expect } from "chai";
import { MetadataOrIdentifierData, Model } from "../../../src/lib/database/model";
import { Resource } from "../../../src/lib/database/resource";
import { Suggestion } from "../../../src/lib/database/suggestion";
import { User } from "../../../src/lib/database/user";
import { Warning } from "../../../src/lib/database/warning";

class TestModel extends Model<{ idParts: ["createdAt"] }> {
	get createdAt(): number {
		return Number(this.idParts[0]);
	}

	constructor(data: MetadataOrIdentifierData<TestModel>) {
		super({
			"@metadata": Model.buildMetadata(data, { collection: "Praises" }),
		});
	}
}

describe("Model", () => {
	describe("idParts()", () => {
		it("returns the expected decoded ID parts.", () => {
			const model = new TestModel({ "@metadata": { "@collection": "Guilds", "@id": "guilds/0/1/2/3" } });
			expect(model.idParts).to.deep.equal([`${0}`, `${1}`, `${2}`, `${3}`]);
		});
	});

	describe("partialId()", () => {
		it("returns the expected partial ID.", () => {
			const model = new TestModel({ "@metadata": { "@collection": "Guilds", "@id": "guilds/0/1/2/3" } });
			expect(model.partialId).to.equal("0/1/2/3");
		});
	});

	describe("constructor()", () => {
		it("creates an object.", () => {
			expect(() => new TestModel({ "@metadata": { "@collection": "Guilds", "@id": "guilds/0" } })).to.not.throw;
		});
	});

	describe("buildMetadata()", () => {
		it("returns the @metadata object that is passed in the data object.", () => {
			const metadata = { "@collection": "Users", "@id": "users/123" } as const;
			expect(Model.buildMetadata<User>({ "@metadata": metadata }, { collection: "Users" })).to.equal(metadata);
		});

		it("creates a new @metadata object if document data was passed in.", () => {
			expect(Model.buildMetadata<User>({ userId: `${123}` }, { collection: "Users" })).to.deep.equal({
				"@collection": "Users",
				"@id": "users/123",
			});
		});
	});

	describe("buildPartialId()", () => {
		it("returns a partial document ID constructed from the passed data.", () => {
			expect(Model.buildPartialId<Warning>({ authorId: `${123}`, targetId: `${456}`, createdAt: `${789}` })).to.equal(
				"123/456/789",
			);
		});

		// TODO(vxern): Improve by including samples of all ordered properties.
		it("arranges the properties in a predetermined order, regardless of how they were passed.", () => {
			const PARTIAL_ID = "123/456/789";

			expect(Model.buildPartialId<Warning>({ authorId: `${123}`, targetId: `${456}`, createdAt: `${789}` })).to.equal(
				PARTIAL_ID,
			);
			expect(Model.buildPartialId<Warning>({ createdAt: `${789}`, authorId: `${123}`, targetId: `${456}` })).to.equal(
				PARTIAL_ID,
			);
			expect(Model.buildPartialId<Warning>({ targetId: `${456}`, createdAt: `${789}`, authorId: `${123}` })).to.equal(
				PARTIAL_ID,
			);
		});

		it("does not include unrecognised ID parts in the result.", () => {
			expect(Model.buildPartialId({ "this-is-an-invalid-id-part": "this-should-be-excluded" })).to.not.contain(
				"this-should-be-excluded",
			);
		});
	});

	describe("buildId()", () => {
		it("returns a document ID composed of the camelCase collection name and a partial document ID.", () => {
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

	describe("all()", () => {
		// TODO(vxern): Add tests.
	});

	describe("crossesRateLimit()", () => {
		it("returns true when the creation dates on the documents collectively cross the passed rate limit.", () => {
			expect(
				// These four documents are created now
				// The rate limit accepts 3 uses within the last hour, meaning the rate limit would be triggered here.
				Model.crossesRateLimit<TestModel>(
					[
						new TestModel({ createdAt: `${Date.now()}` }),
						new TestModel({ createdAt: `${Date.now()}` }),
						new TestModel({ createdAt: `${Date.now()}` }),
						new TestModel({ createdAt: `${Date.now()}` }),
					],
					{ uses: 3, within: [1, "hour"] },
				),
			).to.be.true;
		});

		it("returns false when the creation dates on the documents does not collectively cross the passed rate limit.", () => {
			expect(
				// These four documents have been created a day ago.
				// The rate limit accepts 3 uses within the last hour, but all of the documents are far beyond that mark,
				// so the rate limit would not be triggered here.
				Model.crossesRateLimit<TestModel>(
					[
						new TestModel({ createdAt: `${Date.now() - constants.time.day}` }),
						new TestModel({ createdAt: `${Date.now() - constants.time.day}` }),
						new TestModel({ createdAt: `${Date.now() - constants.time.day}` }),
						new TestModel({ createdAt: `${Date.now() - constants.time.day}` }),
					],
					{ uses: 3, within: [1, "hour"] },
				),
			).to.be.false;
		});
	});

	describe("create()", () => {
		// TODO(vxern): Add tests.
	});

	describe("update()", () => {
		// TODO(vxern): Add tests.
	});

	describe("delete()", () => {
		// TODO(vxern): Add tests.
	});
});

describe("isSupportedCollection()", () => {
	// TODO(vxern): Add tests.
});

describe("getDatabase()", () => {
	// TODO(vxern): Add tests.
});
