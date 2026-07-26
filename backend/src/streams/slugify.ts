import { randomBytes } from 'crypto';

/**
 * Slugify a title, keeping unicode letters/digits (e.g. CJK) so titles like
 * 「主直播间」 do not collapse to an empty string. Falls back to a random
 * "live-xxxxxx" slug when nothing usable remains.
 */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || `live-${randomBytes(3).toString('hex')}`;
}
