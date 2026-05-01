<!-- src/pages/BlogPage.vue -->
<template>
  <section
    ref="pageRef"
    class="flex flex-col gap-8 items-center"
  >
    <h2 class="text-2xl blog-reveal">
      {{ t("admin.blog.title") }}
    </h2>

    <!-- Skeletons -->
    <div
      v-show="loading"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-4 max-w-[1000px] w-full"
      aria-busy="true"
    >
      <article
        v-for="n in 9"
        :key="n"
        class="grid-item space-y-2 blog-item"
      >
        <Skeleton
          width="100%"
          height="12rem"
          class="rounded-lg"
        />

        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <Skeleton
              width="2.25rem"
              height="2.25rem"
              border-radius="999px"
            />
            <Skeleton
              width="2rem"
              height="1rem"
            />
          </div>
          <Skeleton
            width="5.5rem"
            height="0.9rem"
          />
        </div>

        <div class="space-y-2">
          <Skeleton
            width="100%"
            height="0.9rem"
          />
          <Skeleton
            width="92%"
            height="0.9rem"
          />
          <Skeleton
            width="70%"
            height="0.9rem"
          />
        </div>
      </article>
    </div>

    <ContentViewer
      v-show="!loading && posts.length === 0"
      class="w-full max-w-[1000px]"
      :empty-text="t('blog.empty', 'Aún no hay publicaciones para mostrar…')"
    />

    <!-- Grid -->
    <div
      v-show="!loading && posts.length > 0"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-4 max-w-[1000px]"
    >
      <article
        v-for="p in posts"
        :key="p.id"
        class="grid-item space-y-2 blog-item blog-reveal"
      >
        <img
          v-if="p.image"
          :src="p.image"
          loading="lazy"
          class="cursor-pointer w-full aspect-[4/3] object-cover rounded-lg"
          @click="openByPost(p)"
        />

        <div class="flex justify-between">
          <div class="like-container gap-2 items-center">
            <button
              class="like-button"
              type="button"
              :aria-pressed="isLiked(p.id)"
              :disabled="isLiking(p.id)"
              @click="toggleLike(p.id)"
              :class="{
                'is-liked': isLiked(p.id),
                'is-loading': isLiking(p.id),
              }"
            >
              <img
                :src="
                  isLiked(p.id)
                    ? '/assets/images/img9.png'
                    : '/assets/images/img14.png'
                "
                alt="Like"
                class="w-6 h-6 heart-img"
              />
            </button>
            <span class="like-count text-sm">
              {{ p.likes || 0 }}
            </span>
          </div>

          <!-- date du post -->
          <p
            v-if="p.createdAt"
            class="text-xs w-full text-right opacity-60"
          >
            {{ formatDate(p.createdAt) }}
          </p>
        </div>

        <p class="whitespace-pre-wrap text-sm text-left">
          {{ getPostText(p) }}
        </p>
      </article>
    </div>

    <div class="my-6">
      <h1 class="text-2xl font-bold">
        {{
          t("end.names", {
            bride: weddingConfig.couple.brideFirstName,
            groom: weddingConfig.couple.groomFirstName,
          })
        }}
      </h1>
    </div>
  </section>

  <VueEasyLightbox
    :visible="visible"
    :imgs="imgs"
    :index="index"
    @hide="visible = false"
  />
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from "vue";
import { useLang } from "@/composables/useLang";
import {
  ensureFirebase,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "@/services/firebaseClient";
import { api } from "@/services/api";
import { getLocalLikedPosts, saveLocalLikedPosts } from "@/utils/localLikes";
import ContentViewer from "@/components/utils/ContentViewer.vue";
import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import weddingConfig from "../../shared/weddingConfig.ts";

const { t, lang } = useLang();
const loading = ref(true);
const posts = ref([]); // [{ id, image, texts, likes, createdAt(ms) }]

const visible = ref(false);
const imgs = ref([]);
const index = ref(0);
const pageRef = ref(null);
const { revealAllNow, refreshReveal } = useRevealOnScroll({
  root: pageRef,
  selector: ":scope .blog-reveal",
});

// likes locaux de CE navigateur (par postId)
const localLiked = ref(getLocalLikedPosts());

// anti-spam + optimistic UI
const liking = ref(new Set());
function isLiking(postId) {
  return liking.value.has(postId);
}
function isLiked(postId) {
  return localLiked.value.has(postId);
}


function openByPost(p) {
  if (!p?.image) return;
  const list = posts.value.filter((x) => !!x.image).map((x) => x.image);
  imgs.value = list;
  index.value = Math.max(0, list.indexOf(p.image));
  visible.value = true;
}

function tsToMs(v) {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v?.toMillis === "function") return v.toMillis();
  return 0;
}

// format date pour le blog public (date seule)
function formatDate(ms) {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

function safeTexts(input) {
  const t = input && typeof input === "object" ? input : {};
  return {
    es: String(t.es ?? "").trim(),
    en: String(t.en ?? "").trim(),
  };
}

onMounted(async () => {
  try {
    const { fs } = await ensureFirebase();

    const q = query(
      collection(fs, "blogPosts"),
      orderBy("createdAt", "desc"),
      limit(50),
    );

    const snap = await getDocs(q);
    const next = snap.docs.map((d) => {
      const v = d.data() || {};
      return {
        id: d.id,
        image: v.image || "",
        texts: safeTexts(v.texts),
        likes: Number(v.likes || 0),
        createdAt: tsToMs(v.createdAt),
      };
    });

    posts.value = next;
  } catch (err) {
    console.error("Blog load error:", err);
  } finally {
    await nextTick();
    // Ensure content targets are already revealed before switching from skeletons to content
    // to avoid a blank frame when reveal-on-scroll hides newly inserted nodes.
    revealAllNow();
    loading.value = false;
    await nextTick();
    refreshReveal();
  }
});

async function toggleLike(postId) {
  if (!postId) return;
  if (liking.value.has(postId)) return;

  const post = posts.value.find((p) => p.id === postId);
  if (!post) return;

  liking.value.add(postId);

  const alreadyLiked = localLiked.value.has(postId);
  const prevLikes = Number(post.likes || 0);

  // UX optimiste
  if (alreadyLiked) {
    localLiked.value.delete(postId);
    saveLocalLikedPosts(localLiked.value);
    post.likes = Math.max(0, prevLikes - 1);
  } else {
    localLiked.value.add(postId);
    saveLocalLikedPosts(localLiked.value);
    post.likes = prevLikes + 1;
  }

  try {
    await (alreadyLiked
      ? api.unlikeBlogPost(postId)
      : api.likeBlogPost(postId));

    // Le snapshot Firestore est la source de vérité, il remettra le vrai compteur.
    // Tu peux ignorer out ici.
  } catch (e) {
    console.error("toggleLike error:", e);

    // rollback
    if (alreadyLiked) {
      localLiked.value.add(postId);
      saveLocalLikedPosts(localLiked.value);
      post.likes = prevLikes;
    } else {
      localLiked.value.delete(postId);
      saveLocalLikedPosts(localLiked.value);
      post.likes = prevLikes;
    }
  } finally {
    liking.value.delete(postId);
  }
}

const currentLangKey = computed(() => {
  const all = weddingConfig.i18n?.languages || {};
  const defaultKey =
    weddingConfig.i18n?.defaultLang || Object.keys(all)[0] || "es";

  const code = lang.value;
  if (code && all[code]) return code;
  return defaultKey;
});

function getPostText(p) {
  const texts = p.texts || {};

  const fromCurrent = texts[currentLangKey.value];
  if (fromCurrent && fromCurrent.trim()) return fromCurrent;

  const all = weddingConfig.i18n?.languages || {};
  const defaultKey = weddingConfig.i18n?.defaultLang || Object.keys(all)[0];
  if (defaultKey && texts[defaultKey] && texts[defaultKey].trim()) {
    return texts[defaultKey];
  }

  const any = Object.values(texts).find((s) => s && s.trim());
  if (any) return any;

  return "";
}
</script>
