import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  MutationCtx,
  query,
} from "./_generated/server";
import { Track } from "../src/types";

async function findRow(
  ctx: MutationCtx,
  userId: Id<"users">,
  domainId: string
) {
  return ctx.db
    .query("tracks")
    .withIndex("by_user_domain", (q) =>
      q.eq("userId", userId).eq("domainId", domainId)
    )
    .unique();
}

export const list = query({
  args: {},
  handler: async (ctx): Promise<Track[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("tracks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    // najnowsze pierwsze — jak dawna historia
    return rows
      .map((r) => r.data as Track)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  },
});

export const remove = mutation({
  args: { domainId: v.string() },
  handler: async (ctx, { domainId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Niezalogowany");
    const row = await findRow(ctx, userId, domainId);
    if (row) await ctx.db.delete(row._id);
  },
});

export const patch = mutation({
  args: { domainId: v.string(), patch: v.any() },
  handler: async (ctx, { domainId, patch }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Niezalogowany");
    const row = await findRow(ctx, userId, domainId);
    if (row) await ctx.db.patch(row._id, { data: { ...row.data, ...patch } });
  },
});

// --- Wywoływane z actions (suno.ts) ---

export const getInternal = internalQuery({
  args: { userId: v.id("users"), domainId: v.string() },
  handler: async (ctx, { userId, domainId }): Promise<Track | null> => {
    const row = await ctx.db
      .query("tracks")
      .withIndex("by_user_domain", (q) =>
        q.eq("userId", userId).eq("domainId", domainId)
      )
      .unique();
    return (row?.data as Track) ?? null;
  },
});

export const listByAlbumInternal = internalQuery({
  args: { userId: v.id("users"), album: v.string() },
  handler: async (ctx, { userId, album }): Promise<Track[]> => {
    const rows = await ctx.db
      .query("tracks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((r) => r.data as Track).filter((t) => t.album === album);
  },
});

export const insertInternal = internalMutation({
  args: { userId: v.id("users"), track: v.any() },
  handler: async (ctx, { userId, track }) => {
    await ctx.db.insert("tracks", {
      userId,
      domainId: (track as Track).id,
      data: track,
    });
  },
});

/** Podmienia cały obiekt utworu (patchInternal merguje, więc nie umie czyścić pól). */
export const replaceInternal = internalMutation({
  args: { userId: v.id("users"), domainId: v.string(), track: v.any() },
  handler: async (ctx, { userId, domainId, track }) => {
    const row = await findRow(ctx, userId, domainId);
    if (row) await ctx.db.patch(row._id, { data: track });
  },
});

export const patchInternal = internalMutation({
  args: { userId: v.id("users"), domainId: v.string(), patch: v.any() },
  handler: async (ctx, { userId, domainId, patch }) => {
    const row = await findRow(ctx, userId, domainId);
    if (row) await ctx.db.patch(row._id, { data: { ...row.data, ...patch } });
  },
});
