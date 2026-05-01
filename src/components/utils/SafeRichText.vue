<template>
  <component :is="tag">
    <template
      v-for="(token, index) in tokens"
      :key="`${token.type}-${index}`"
    >
      <br v-if="token.type === 'br'" />
      <strong v-else-if="token.type === 'strong'">{{ token.text }}</strong>
      <template v-else>{{ token.text }}</template>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { parseTrustedRichText } from "@/utils/richText";

const props = withDefaults(
  defineProps<{
    text: string;
    tag?: "p" | "span" | "div";
  }>(),
  {
    tag: "span",
  },
);

const tokens = computed(() => parseTrustedRichText(props.text));
</script>
