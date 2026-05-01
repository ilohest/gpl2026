import { nextTick, onMounted, onUnmounted, type Ref } from "vue";

type RevealOptions = {
  root: Ref<HTMLElement | null>;
  selector?: string;
  threshold?: number;
  rootMargin?: string;
  staggerMs?: number;
};

const REVEAL_CLASS = "reveal-on-scroll";
const REVEALED_CLASS = "is-revealed";

export function useRevealOnScroll({
  root,
  selector = ":scope > *",
  threshold = 0.12,
  rootMargin = "0px 0px -8% 0px",
  staggerMs = 55,
}: RevealOptions) {
  let observer: IntersectionObserver | null = null;

  const getTargets = () => {
    const host = root.value;
    if (!host) return [] as HTMLElement[];
    return Array.from(host.querySelectorAll(selector)).filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    );
  };

  const revealImmediately = (targets: HTMLElement[]) => {
    targets.forEach((el) => {
      el.classList.remove(REVEAL_CLASS);
      el.classList.add(REVEALED_CLASS);
    });
  };

  const refreshReveal = () => {
    const targets = getTargets();
    if (!targets.length) return;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      revealImmediately(targets);
      return;
    }

    if (!observer) {
      observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add(REVEALED_CLASS);
            obs.unobserve(entry.target);
          });
        },
        {
          threshold,
          rootMargin,
        },
      );
    }

    targets.forEach((el, index) => {
      if (el.classList.contains(REVEALED_CLASS)) return;
      el.classList.add(REVEAL_CLASS);
      el.style.setProperty("--reveal-delay", `${index * staggerMs}ms`);
      observer?.observe(el);
    });
  };

  const revealAllNow = () => {
    const targets = getTargets();
    if (!targets.length) return;
    observer?.disconnect();
    observer = null;
    revealImmediately(targets);
  };

  onMounted(async () => {
    await nextTick();
    refreshReveal();
  });

  onUnmounted(() => {
    observer?.disconnect();
    observer = null;
  });

  return { refreshReveal, revealAllNow };
}
