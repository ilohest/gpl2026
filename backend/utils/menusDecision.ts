// backend/utils/menusDecision.ts
import {
  normalizeDietCodes,
  ensureOtherIfText,
} from "../../shared/dietTypes.js";

/**
 * NEW schema ONLY
 * - guest.dietCodes: string[]
 * - guest.dietOtherText: string
 */

type GuestLike = {
  dietCodes?: unknown;
  dietOtherText?: unknown;
};

type MenuLike = {
  id?: string | null;
  docId?: string | null;
  active?: boolean;
  priority?: unknown;
  covers?: unknown;
  restrictions?: unknown;
};

type Decision = {
  status: "auto" | "needs_review";
  menuId: string | null;
  reason: string | null;
};

function hasOtherText(row: GuestLike): boolean {
  const other = row?.dietOtherText ?? "";
  return String(other).trim().length > 0;
}

function guestRestrictionSet(row: GuestLike): Set<string> {
  const codes = Array.isArray(row?.dietCodes) ? row.dietCodes : [];
  const otherText = String(row?.dietOtherText ?? "").trim();

  const withOther = ensureOtherIfText(codes, otherText);
  const normalized = normalizeDietCodes(withOther, { dropUnknown: true });
  return new Set(normalized);
}

const menuIdOf = (m: MenuLike): string | null => m?.id ?? m?.docId ?? null;

function prio(menu: MenuLike): number {
  const p = Number(menu?.priority);
  return Number.isFinite(p) ? p : 0;
}

function betterByPriority(a: MenuLike, b: MenuLike): MenuLike | null {
  const pa = prio(a);
  const pb = prio(b);
  if (pa > pb) return a;
  if (pb > pa) return b;
  return null;
}

function menuCoverSet(menu: MenuLike): Set<string> {
  const raw = Array.isArray(menu?.covers)
    ? menu.covers
    : Array.isArray(menu?.restrictions)
      ? menu.restrictions
      : [];
  const normalized = normalizeDietCodes(raw, { dropUnknown: true });
  return new Set(normalized);
}

function coversCount(menu: MenuLike): number {
  return menuCoverSet(menu).size;
}

function isCompatible(guestSet: Set<string>, menuSet: Set<string>): boolean {
  for (const r of guestSet) if (!menuSet.has(r)) return false;
  return true;
}

/**
 * { status: "auto" | "needs_review", menuId: string|null, reason: string|null }
 */
export function getDecisionForGuest(
  guest: GuestLike,
  { menus }: { menus?: MenuLike[] } = {},
): Decision {
  const list = (Array.isArray(menus) ? menus : [])
    .filter((m) => m && menuIdOf(m))
    .filter((m) => m?.active !== false);

  if (!list.length) {
    return { status: "needs_review", menuId: null, reason: "no_menus" };
  }

  if (hasOtherText(guest)) {
    return { status: "needs_review", menuId: null, reason: "has_other_text" };
  }

  const guestSet = guestRestrictionSet(guest);

  // Guest NO restrictions
  if (guestSet.size === 0) {
    const zeroCover = list.filter((m) => coversCount(m) === 0);
    const pool = zeroCover.length ? zeroCover : list;

    const firstPool = pool[0];
    if (!firstPool) {
      return { status: "needs_review", menuId: null, reason: "no_menus" };
    }
    let best = firstPool;
    let tie = false;

    for (let i = 1; i < pool.length; i++) {
      const c = pool[i];
      if (!c) continue;
      const dc = coversCount(c);
      const db = coversCount(best);

      if (dc < db) {
        best = c;
        tie = false;
        continue;
      }

      if (dc === db) {
        const byPrio = betterByPriority(c, best);
        if (byPrio === c) {
          best = c;
          tie = false;
        } else if (byPrio === null) {
          tie = true;
        }
      }
    }

    if (tie) {
      return { status: "needs_review", menuId: null, reason: "ambiguous_tie" };
    }
    return { status: "auto", menuId: menuIdOf(best), reason: null };
  }

  // Guest WITH restrictions: require full coverage
  const compatibles: Array<{ m: MenuLike; mset: Set<string> }> = [];
  for (const m of list) {
    const mset = menuCoverSet(m);
    if (isCompatible(guestSet, mset)) compatibles.push({ m, mset });
  }

  if (!compatibles.length) {
    return { status: "needs_review", menuId: null, reason: "no_match" };
  }

  const first = compatibles[0];
  if (!first) {
    return { status: "needs_review", menuId: null, reason: "no_match" };
  }

  let best = first.m;
  let bestExtras = first.mset.size - guestSet.size;
  let tie = false;

  for (let i = 1; i < compatibles.length; i++) {
    const current = compatibles[i];
    if (!current) continue;
    const { m, mset } = current;
    const extras = mset.size - guestSet.size;

    if (extras < bestExtras) {
      best = m;
      bestExtras = extras;
      tie = false;
      continue;
    }

    if (extras === bestExtras) {
      const byPrio = betterByPriority(m, best);
      if (byPrio === m) {
        best = m;
        tie = false;
      } else if (byPrio === null) {
        tie = true;
      }
    }
  }

  if (tie) {
    return { status: "needs_review", menuId: null, reason: "ambiguous_tie" };
  }
  return { status: "auto", menuId: menuIdOf(best), reason: null };
}
