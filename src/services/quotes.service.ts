import { db } from '@/db';
import { quotes, type NewQuote } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Creates or updates a Bible quote
 * @param quote - The quote data to upsert
 * @returns The created/updated quote with its ID
 */
export async function upsertQuote(quote: NewQuote & { id?: number }) {
  const now = new Date().toISOString();

  // If updating an existing quote and publishing it, set publishedAt
  const quoteData = {
    ...quote,
    updatedAt: now,
    ...(quote.published && !quote.publishedAt ? { publishedAt: now } : {}),
  };

  if (quote.id) {
    // Update existing quote
    await db
      .update(quotes)
      .set(quoteData)
      .where(eq(quotes.id, quote.id));

    return { id: quote.id };
  }

  // Insert new quote
  const result = await db
    .insert(quotes)
    .values(quoteData)
    .returning({ id: quotes.id });

  return result[0];
}

/**
 * Deletes a quote by ID
 * @param id - The quote ID to delete
 */
export async function deleteQuote(id: number) {
  await db.delete(quotes).where(eq(quotes.id, id));
}

/**
 * Fetches all published quotes with only public information
 * @returns Array of published quotes with public fields only
 */
export async function getPublishedQuotes() {
  return await db
    .select({
      id: quotes.id,
      userName: quotes.userName,
      reference: quotes.reference,
      userLanguage: quotes.userLanguage,
      userNote: quotes.userNote,
      createdAt: quotes.createdAt,
      updatedAt: quotes.updatedAt,
      publishedAt: quotes.publishedAt,
    })
    .from(quotes)
    .where(eq(quotes.published, true))
    .orderBy(sql`${quotes.publishedAt} DESC`);
}
