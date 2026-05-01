<!-- src/components/auth/Can.vue -->
<template>
  <slot v-if="ok" />
</template>

<script setup>
import { computed } from "vue";
import { useMeStore } from "@/stores/meStore";

const props = defineProps({
  module: { type: String, default: "" }, // ex "rsvp"
  mode: { type: String, default: "read" }, // "read" | "write"
  perm: { type: String, default: "" }, // ex "emails:send" si tu veux bypass module/mode
});

const me = useMeStore();

const ok = computed(() => {
  if (props.perm) return me.hasPerm(props.perm);
  if (!props.module) return false;
  return props.mode === "write"
    ? me.canWrite(props.module)
    : me.canRead(props.module);
});
</script>
