<template>
  <div class="content-viewer bg-gray-100 px-3 py-2 rounded-md border border-gray-200">
    <div
      v-if="showNoResults"
      class="flex items-center gap-2"
    >
      <i
        :class="noResultsIcon"
        class="text-secondary-text"
      />
      <p class="text-sm text-secondary-text m-0">
        {{ noResultsText }}
      </p>
    </div>

    <div
      v-else-if="content"
      class="flex items-center gap-2"
    >
      <i
        :class="contentIcon"
        class="text-secondary-text"
      />
      <!-- Security: sanitizedContent is whitelist-sanitized before injection. -->
      <!-- eslint-disable vue/no-v-html -->
      <p
        v-html="sanitizedContent"
        class="content-wrapper text-sm text-secondary-text m-0"
      >
      </p>
      <!-- eslint-enable vue/no-v-html -->
    </div>

    <div
      v-else
      class="flex items-center gap-2"
    >
      <i
        :class="contentIcon"
        class="text-secondary-text"
      />
      <p class="text-sm text-secondary-text m-0">
        {{ emptyText }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  content: {
    type: String,
    default: "",
  },
  showNoResults: {
    type: Boolean,
    default: false,
  },
  emptyText: {
    type: String,
    default: "No information available yet.",
  },
  noResultsText: {
    type: String,
    default: "No results for this search.",
  },
  contentIcon: {
    type: String,
    default: "pi pi-info-circle",
  },
  noResultsIcon: {
    type: String,
    default: "pi pi-search",
  },
});

const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "u",
  "ul",
]);

const ALLOWED_ATTRS_BY_TAG = {
  a: new Set(["href", "target", "rel"]),
};

const SAFE_HREF = /^(https?:|mailto:|tel:|\/|#)/i;

function sanitizeElementAttributes(el) {
  const tag = el.tagName.toLowerCase();
  const allowedAttrs = ALLOWED_ATTRS_BY_TAG[tag] ?? new Set();

  for (const attr of Array.from(el.attributes)) {
    if (!allowedAttrs.has(attr.name)) {
      el.removeAttribute(attr.name);
    }
  }

  if (tag !== "a") return;

  const href = (el.getAttribute("href") ?? "").trim();
  if (!SAFE_HREF.test(href)) {
    el.removeAttribute("href");
  }
  if (el.getAttribute("target") === "_blank") {
    el.setAttribute("rel", "noopener noreferrer");
  }
}

function sanitizeTree(parent, doc) {
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const element = child;
    const tag = element.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      const fragment = doc.createDocumentFragment();
      for (const nested of Array.from(element.childNodes)) {
        fragment.appendChild(nested);
      }
      element.replaceWith(fragment);
      sanitizeTree(parent, doc);
      continue;
    }

    sanitizeElementAttributes(element);
    sanitizeTree(element, doc);
  }
}

function sanitizeRichHtml(input) {
  const raw = String(input ?? "");
  if (!raw.trim()) return "";

  const doc = new DOMParser().parseFromString(`<div>${raw}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  sanitizeTree(root, doc);
  return root.innerHTML;
}

const sanitizedContent = computed(() => sanitizeRichHtml(props.content));
</script>

<style scoped>
.content-wrapper {
  word-break: break-word;
}

.content-viewer :deep(h1),
.content-viewer :deep(h2) {
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 0.5rem;
  margin-top: 1rem;
}

.content-viewer :deep(p) {
  margin-bottom: 0;
}
</style>
