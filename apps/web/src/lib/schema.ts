import { relations, sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const googleConnections = pgTable("google_connections", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const artifactSelections = pgTable("artifact_selections", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.purpose] })]);

export const skills = pgTable("skills", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  version: integer("version").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  files: jsonb("files").$type<Record<string, string>>().notNull(),
  digest: text("digest").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("skills_owner_slug_version_unique").on(table.userId, table.slug, table.version),
  uniqueIndex("skills_one_enabled_version_unique").on(table.userId, table.slug).where(sql`${table.enabled} = true`),
]);

export const usersRelations = relations(users, ({ one, many }) => ({
  googleConnection: one(googleConnections),
  artifactSelections: many(artifactSelections),
  skills: many(skills),
}));

export const googleConnectionsRelations = relations(googleConnections, ({ one }) => ({
  user: one(users, { fields: [googleConnections.userId], references: [users.id] }),
}));

export const artifactSelectionsRelations = relations(artifactSelections, ({ one }) => ({
  user: one(users, { fields: [artifactSelections.userId], references: [users.id] }),
}));

export const skillsRelations = relations(skills, ({ one }) => ({
  user: one(users, { fields: [skills.userId], references: [users.id] }),
}));
