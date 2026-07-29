import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const greetings = sqliteTable("greetings", {
  id: text("id").primaryKey(),
  ownerTokenHash: text("owner_token_hash").notNull().unique(),
  publicSlug: text("public_slug").notNull().unique(),
  recipientName: text("recipient_name").notNull(),
  senderName: text("sender_name").notNull(),
  template: text("template").notNull(),
  headline: text("headline").notNull(),
  message: text("message").notNull(),
  surpriseMessage: text("surprise_message").notNull(),
  musicUrl: text("music_url").notNull(),
  musicName: text("music_name").notNull(),
  photosJson: text("photos_json").notNull(),
  birthdayDate: text("birthday_date").notNull(),
  openedAt: text("opened_at"),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const responses = sqliteTable(
  "responses",
  {
    id: text("id").primaryKey(),
    greetingId: text("greeting_id")
      .notNull()
      .references(() => greetings.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    message: text("message").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("responses_greeting_id_idx").on(table.greetingId),
  ],
);
