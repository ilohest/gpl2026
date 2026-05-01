<!-- src/components/admin/menus/MenusDietTab.vue -->
<template>
  <div
    v-if="dietGroups.length"
    class="grid grid-cols-1 md:grid-cols-2 gap-3"
  >
    <div
      v-for="g in dietGroups"
      :key="g.key"
      class="rounded-xl bg-[var(--surface-soft)] p-3"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex items-center gap-2 min-w-0"
        >
          <img
            v-if="g.icon"
            :src="g.icon"
            alt=""
            class="w-5 h-5 object-contain flex-shrink-0"
          />
          <p class="font-semibold text-sm truncate">
            {{ g.label }}
          </p>
        </div>

        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border border-gray-200 bg-gray-50"
        >
          {{ g.count }}
        </span>
      </div>

      <ul class="mt-2 pl-5 list-disc text-sm">
        <li
          v-for="name in g.names"
          :key="name"
          class="text-left"
        >
          {{ name }}
        </li>
      </ul>
    </div>
  </div>

  <p
    v-else
    class="text-sm opacity-70"
  >
    {{ t("admin.diet.dialog_none") }}
  </p>
</template>

<script setup>
import { computed, ref, watch } from "vue";

import { useLang } from "@/composables/useLang";
import { useGuestDirectoryStore } from "@/stores/guestDirectoryStore";
import {
  normalizeDietCodes,
  ensureOtherIfText,
} from "../../../../shared/dietTypes";
import { getDietBadges } from "@/shared/dietIcons";

const { t } = useLang();
const guestDir = useGuestDirectoryStore();

/**
 * Optionnel: si DietTab peut être monté sans que MenusSection ait déjà fait load().
 * On charge l'annuaire des invités (attending only) avec les champs diet.
 */
const _loadedOnce = ref(false);
watch(
  () => guestDir.items,
  async (rows) => {
    if (_loadedOnce.value) return;
    if (rows && rows.length) {
      _loadedOnce.value = true;
      return;
    }
    _loadedOnce.value = true;
    try {
      await guestDir.load({
        scope: "ONLY_ATTENDING",
        fields: ["menus"],
      });
    } catch (e) {
      console.error("[MenusDietTab] guestDir.load failed", e);
    }
  },
  { immediate: true },
);

// NEW: attending is boolean|null
function isRowAttending(row) {
  return row?.attending === true;
}

// NEW: name fields are fullName/firstName/lastName (store already builds fullName)
function fullNameFromRow(row) {
  const fromFull = String(row?.fullName || "").trim();
  if (fromFull) return fromFull;

  const f = String(row?.firstName || "").trim();
  const l = String(row?.lastName || "").trim();
  return `${f} ${l}`.trim() || "—";
}

const dietGroups = computed(() => {
  const map = new Map();

  for (const r of guestDir.items || []) {
    if (!isRowAttending(r)) continue;

    const name = fullNameFromRow(r);

    // NEW FIELDS
    const otherText = String(r?.dietOtherText || "").trim();
    let codes = Array.isArray(r?.dietCodes) ? r.dietCodes : [];

    // keep shared normalization logic
    codes = normalizeDietCodes(codes, { dropUnknown: true });
    codes = ensureOtherIfText(codes, otherText);

    const rawBadges = getDietBadges(codes, otherText);

    for (const b of rawBadges) {
      const isOther = b.key === "other";
      const label =
        isOther && b.tooltip
          ? b.tooltip
          : isOther
            ? t("admin.stats.other_not_specified")
            : t(b.i18nKey);

      const key =
        isOther && b.tooltip
          ? `other:${String(b.tooltip).toLowerCase()}`
          : isOther
            ? "other:__empty__"
            : `code:${b.key}`;

      if (!map.has(key)) {
        map.set(key, { key, label, icon: b.icon, names: new Set() });
      }
      map.get(key).names.add(name);
    }
  }

  return Array.from(map.values())
    .map((g) => ({
      ...g,
      names: Array.from(g.names).sort((a, b) => a.localeCompare(b)),
      count: g.names.size,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
});
</script>
