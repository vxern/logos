interface ResourceFormData {
	resource: string;
}

interface ResourceDocument {
	formData: ResourceFormData;
	isResolved: boolean;
}

export type { ResourceDocument, ResourceFormData };
