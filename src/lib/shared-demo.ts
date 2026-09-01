import type { Permissions, Relationship, SharedField } from "../../packages/access";
export type { SharedField } from "../../packages/access";
export const demoRelationship: Relationship = { id: "family-demo", ownerId: "child-noor", viewerId: "parent-demo", permissions: { learningProgress: true, readingConsistency: true }, status: "active" };
export const demoTeacherRelationship: Relationship = { id: "teacher-demo", ownerId: "child-noor", viewerId: "teacher-demo", permissions: { learningProgress: true, weakAreas: true, completedLessons: true, readingConsistency: true }, status: "active" };
export const demoPermissions: Permissions = { ...demoRelationship.permissions };
export const sharedFieldLabels: Record<SharedField, string> = { learningProgress: "Learning progress", memorization: "Memorization", weakAreas: "Weak areas", completedLessons: "Completed lessons", readingConsistency: "Reading consistency", recitation: "Recitation" };
