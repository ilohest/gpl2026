// src/shared/dietIcons.js
import vegetarianIcon from "@/assets/icons/vegetarian.png";
import veganIcon from "@/assets/icons/vegan.png";
import glutenFreeIcon from "@/assets/icons/gluten_free.png";
import lactoseFreeIcon from "@/assets/icons/lactose_free.png";
import nutsAllergyIcon from "@/assets/icons/nuts_allergy.png";
import pregnantIcon from "@/assets/icons/pregnant.png";
import otherIcon from "@/assets/icons/other.png";

import { normalizeDietCodes, DIET_DEF_BY_CODE } from "../../shared/dietTypes";

type DietBadge = {
  key: string;
  icon: string | null;
  i18nKey: string;
  tooltip: string | null;
};

const ICON_BY_CODE: Record<string, string> = {
  vegetarian: vegetarianIcon,
  vegan: veganIcon,
  gluten_free: glutenFreeIcon,
  lactose_free: lactoseFreeIcon,
  nuts_allergy: nutsAllergyIcon,
  pregnant: pregnantIcon,
  other: otherIcon,
};

export function getDietBadges(dietCodes: unknown, otherDetails: unknown): DietBadge[] {
  const uniq = [
    ...new Set(normalizeDietCodes(dietCodes, { dropUnknown: true })),
  ];
  if (!uniq.length) return [];

  const other = String(otherDetails || "").trim();

  return uniq
    .map((code): DietBadge | null => {
      const def = DIET_DEF_BY_CODE.get(code);
      if (!def) return null;

      return {
        key: def.code,
        icon: ICON_BY_CODE[def.code] || null,
        i18nKey: def.i18nKey,
        tooltip: def.code === "other" ? other || null : null,
      };
    })
    .filter((badge): badge is DietBadge => Boolean(badge));
}
