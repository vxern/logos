interface DatabaseMetadataDocument {
	createdAt: number;
	migrations: string[];
	testGuildId?: string;
}

export type { DatabaseMetadataDocument };
