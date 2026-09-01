export type SharedField = "learningProgress" | "memorization" | "weakAreas" | "completedLessons" | "readingConsistency" | "recitation";
export const sharedFields: SharedField[] = ["learningProgress", "memorization", "weakAreas", "completedLessons", "readingConsistency"];
export type Permissions = Partial<Record<SharedField, boolean>>;
export type Relationship = { id: string; ownerId: string; viewerId: string; permissions: Permissions; status: "pending" | "active" };
export function canViewRelationship(relationship: Relationship, viewerId: string, field: SharedField) { return relationship.status === "active" && relationship.ownerId !== viewerId && relationship.viewerId === viewerId && relationship.permissions[field] === true; }
export function canManageRelationship(relationship: Relationship, ownerId: string) { return relationship.status === "active" && relationship.ownerId === ownerId; }
export function visibleSnapshot(relationship: Relationship, viewerId: string, snapshot: Partial<Record<SharedField, unknown>>) { return Object.fromEntries(Object.entries(snapshot).filter(([field]) => canViewRelationship(relationship, viewerId, field as SharedField))); }
