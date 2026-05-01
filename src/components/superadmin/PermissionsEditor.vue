<!-- src/components/superadmin/PermissionsEditor.vue -->
<template>
  <div class="space-y-4">
    <!-- Help -->
    <div
      v-if="hasHelpText"
      class="text-xs opacity-70 border rounded-lg p-2 bg-black/[0.02]"
    >
      {{ helpText }}
    </div>

    <!-- Bulk actions -->
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-2"
    >
      <div class="flex flex-wrap gap-2 justify-end w-full">
        <Button
          icon="pi pi-eye"
          size="small"
          severity="secondary"
          outlined
          :label="bulkReadLabel"
          :disabled="isSuperadmin"
          @click="applyPreset('read')"
        />
        <Button
          icon="pi pi-pencil"
          size="small"
          severity="secondary"
          outlined
          :label="bulkWriteLabel"
          :disabled="isSuperadmin"
          @click="applyPreset('write')"
        />
        <Button
          icon="pi pi-times"
          size="small"
          text
          severity="secondary"
          :label="bulkClearAllLabel"
          :disabled="isSuperadmin"
          @click="checkAllNonSuperadmin(false)"
        />
      </div>
    </div>

    <!-- Groups -->
    <div class="space-y-4">
      <div
        v-for="g in permissionGroups"
        :key="g.key"
        class="border rounded-xl p-3"
      >
        <div class="font-medium mb-2">
          {{
            g.key === "core"
              ? t("superadmin.perms.item.superadmin_all")
              : t(g.labelKey)
          }}
        </div>
        <Divider class="!my-2" />

        <div class="space-y-2">
          <div
            v-for="p in g.items"
            :key="p.value"
            class="flex items-start justify-between gap-4"
          >
            <div class="flex-1 min-w-0 text-left pr-2">
              <div
                v-if="p.value !== 'superadmin:all'"
                class="text-sm"
                :class="p.danger ? ' font-semibold' : ''"
              >
                {{ t(p.itemLabelKey) }}
              </div>

              <div
                v-if="p.value === 'superadmin:all'"
                class="text-xs mt-1 !text-left"
              >
                {{ superadminWarningText }}
              </div>

              <div
                v-else-if="isSuperadmin"
                class="text-xs opacity-60 mt-1"
              >
                {{ superadminLocksOtherPermsText }}
              </div>
            </div>

            <div class="shrink-0 pt-0.5">
              <ToggleSwitch
                :disabled="isPermDisabled(p)"
                :model-value="hasPerm(p.value)"
                @update:model-value="(val) => setPerm(p.value, val)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected permissions (same visual language as popover) -->
    <div class="mt-2">
      <div class="space-y-2">
        <div
          v-for="row in selectedPermissionRows"
          :key="row.key"
          class="perm-row"
        >
          <div class="perm-row-label text-xs">
            {{ row.label }}
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="chip in row.chips"
              :key="chip.key"
              v-tooltip.top="chip.tooltip"
              class="perm-chip perm-chip-popover perm-chip-action text-xs"
              :class="chip.className"
            >
              <i :class="chip.icon" />
            </span>
          </div>
        </div>
        <span
          v-if="!permsSorted.length"
          class="opacity-60 text-xs"
        >—</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import Button from "primevue/button";
import Divider from "primevue/divider";
import ToggleSwitch from "primevue/toggleswitch";

/**
 * Props
 */
const props = defineProps({
  t: { type: Function, required: true },

  // Full group meta (same structure as you already have)
  permissionGroups: { type: Array, required: true },

  // v-model list of perms
  modelValue: { type: Array, default: () => [] },

  // Labels / texts (keep SuperAdminPage in control of translations keys)
  helpText: { type: String, default: "" },

  bulkTitle: { type: String, default: "" },
  bulkReadLabel: { type: String, default: "" },
  bulkWriteLabel: { type: String, default: "" },
  bulkCheckAllLabel: { type: String, default: "" },
  bulkClearAllLabel: { type: String, default: "" },

  superadminWarningText: { type: String, default: "" },
  superadminLocksOtherPermsText: { type: String, default: "" },

  // Label resolver for chips
  permissionLabel: { type: Function, required: true },
});

const emit = defineEmits(["update:modelValue"]);

/* ---------- derived ---------- */
const perms = computed(() =>
  Array.isArray(props.modelValue) ? props.modelValue : [],
);

const isSuperadmin = computed(() => perms.value.includes("superadmin:all"));

const allPermValues = computed(() =>
  props.permissionGroups.flatMap((g) => g.items.map((it) => it.value)),
);

function hasPermissionValue(v) {
  return allPermValues.value.includes(String(v || "").trim());
}

const allNonSuperadminValues = computed(() =>
  allPermValues.value.filter((v) => v !== "superadmin:all"),
);

function update(next) {
  emit("update:modelValue", Array.isArray(next) ? next : []);
}

function isPermDisabled(p) {
  if (p?.value === "superadmin:all") return false;
  return isSuperadmin.value;
}

function hasPerm(v) {
  return perms.value.includes(v);
}

function setPerm(v, on) {
  const key = String(v || "").trim();
  if (!key) return;

  // superadmin ON => reset clean
  if (key === "superadmin:all" && on) {
    update(["superadmin:all"]);
    return;
  }

  // superadmin OFF => unlock everything
  if (key === "superadmin:all" && !on) {
    update(perms.value.filter((p) => p !== "superadmin:all"));
    return;
  }

  // superadmin ON => ignore other toggles
  if (isSuperadmin.value) return;

  const s = new Set(perms.value || []);
  if (on) s.add(key);
  else s.delete(key);

  const [module, action] = key.split(":");
  const readPerm = `${module}:read`;
  const writePerm = `${module}:write`;

  // generic rule
  if (action === "write" && on && hasPermissionValue(readPerm)) s.add(readPerm);
  if (action === "read" && !on && hasPermissionValue(writePerm))
    s.delete(writePerm);

  // emails rule
  if (key === "emails:send" && on) s.add("emails:read");
  if (key === "emails:read" && !on) s.delete("emails:send");

  update([...s]);
}

function checkAllNonSuperadmin(on) {
  if (isSuperadmin.value) return;

  if (!on) {
    update([]);
    return;
  }

  // build clean with setPerm rules
  let next = [];
  update([]); // flush first
  for (const v of allNonSuperadminValues.value) {
    // emulate setPerm without relying on reactivity order
    const s = new Set(next);
    s.add(v);

    const [module, action] = String(v).split(":");
    const readPerm = `${module}:read`;
    if (action === "write" && hasPermissionValue(readPerm)) s.add(readPerm);
    if (v === "emails:send") s.add("emails:read");

    next = [...s];
  }
  update(next);
}

/**
 * Presets:
 * - read: set X:read for each module, remove X:write + emails:send
 * - write: set X:write for each module (auto adds read), + emails:send
 */
function applyPreset(mode) {
  if (isSuperadmin.value) return;

  const next = new Set();

  for (const group of props.permissionGroups) {
    if (group.key === "core") continue;

    if (group.key === "emails") {
      next.add("emails:read");
      if (mode === "write") next.add("emails:send");
      continue;
    }

    if (mode === "read") {
      const readPerm = `${group.key}:read`;
      if (hasPermissionValue(readPerm)) next.add(readPerm);
      // ensure write removed (no-op)
      continue;
    }

    // write mode
    const writePerm = `${group.key}:write`;
    const readPerm = `${group.key}:read`;
    if (hasPermissionValue(writePerm)) next.add(writePerm);
    if (hasPermissionValue(readPerm)) next.add(readPerm);
  }

  update([...next]);
}

const permsSorted = computed(() => {
  const arr = Array.isArray(perms.value) ? [...perms.value] : [];
  const order = [];
  for (const g of props.permissionGroups)
    for (const it of g.items) order.push(it.value);
  arr.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return arr;
});

const hasHelpText = computed(
  () => String(props.helpText || "").trim().length > 0,
);

function findPermMeta(value) {
  const v = String(value || "").trim();
  for (const g of props.permissionGroups) {
    const it = g.items.find((x) => x.value === v);
    if (it) return { groupKey: g.key, groupLabelKey: g.labelKey, item: it };
  }
  return null;
}

function permissionActionChip(value) {
  const key = String(value || "").trim();
  const v = key.toLowerCase();
  const fullLabel = props.permissionLabel(key, { withGroup: true });

  if (v === "superadmin:all") {
    return {
      key,
      icon: "pi pi-shield",
      className: "perm-chip-superadmin",
      tooltip: `${fullLabel} — ${props.superadminWarningText}`,
      order: 0,
    };
  }

  if (v.endsWith(":read")) {
    return {
      key,
      icon: "pi pi-book",
      className: "perm-chip-read",
      tooltip: fullLabel,
      order: 1,
    };
  }

  if (v.endsWith(":write")) {
    return {
      key,
      icon: "pi pi-pencil",
      className: "perm-chip-write",
      tooltip: fullLabel,
      order: 2,
    };
  }

  if (v.endsWith(":send")) {
    return {
      key,
      icon: "pi pi-send",
      className: "perm-chip-send",
      tooltip: fullLabel,
      order: 3,
    };
  }

  return {
    key,
    icon: "pi pi-key",
    className: "perm-chip-default",
    tooltip: fullLabel,
    order: 9,
  };
}

const selectedPermissionRows = computed(() => {
  const rowsMap = new Map();
  for (const p of permsSorted.value) {
    const meta = findPermMeta(p);
    const rowKey = meta?.groupKey || `misc:${p}`;
    const rowLabel = meta
      ? meta.groupKey === "core"
        ? props.permissionLabel(p, { withGroup: false })
        : props.t(meta.groupLabelKey)
      : props.permissionLabel(p, { withGroup: true });

    if (!rowsMap.has(rowKey)) {
      rowsMap.set(rowKey, { key: rowKey, label: rowLabel, chips: [] });
    }
    rowsMap.get(rowKey).chips.push(permissionActionChip(p));
  }

  const orderByRowKey = (k) => {
    if (k === "core") return -1;
    const idx = props.permissionGroups.findIndex((g) => g.key === k);
    return idx >= 0 ? idx : 999;
  };

  return [...rowsMap.values()]
    .map((r) => ({
      ...r,
      chips: r.chips.sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => orderByRowKey(a.key) - orderByRowKey(b.key));
});
</script>

<style scoped>
.perm-chip {
  align-items: center;
  border-radius: 9999px;
  border: 1px solid transparent;
  display: inline-flex;
  font-weight: 600;
  gap: 0.35rem;
  line-height: 1;
  padding: 0.36rem 0.6rem;
  white-space: nowrap;
}

.perm-chip i {
  font-size: 0.72rem;
}

.perm-chip-read {
  background: #eaf4ff;
  border-color: #cfe4fb;
  color: #165d99;
}

.perm-chip-write {
  background: #edf9f1;
  border-color: #ccebd6;
  color: #1b7f45;
}

.perm-chip-send {
  background: #fff6e8;
  border-color: #f4debc;
  color: #9a5800;
}

.perm-chip-superadmin {
  background: #fef1f1;
  border-color: #f4cdcd;
  color: #8c1d18;
}

.perm-chip-default {
  background: #f3f4f6;
  border-color: #e5e7eb;
  color: #374151;
}

.perm-chip-popover {
  padding: 0.3rem 0.52rem;
}

.perm-chip-action {
  gap: 0;
  justify-content: center;
  min-width: 1.8rem;
  padding-inline: 0.5rem;
}

.perm-row {
  align-items: center;
  display: grid;
  gap: 0.4rem 0.8rem;
  grid-template-columns: minmax(108px, 1fr) minmax(0, 2fr);
}

.perm-row-label {
  color: rgba(0, 0, 0, 0.62);
  font-weight: 600;
}
</style>
