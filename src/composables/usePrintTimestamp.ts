// src/composables/usePrintTimestamp.js
import { ref } from "vue";
import type { Ref } from "vue";

/**
 * Timestamp "figé" au moment où tu déclenches le print.
 * Usage:
 *  const { printedAt, stampNow } = usePrintTimestamp()
 *  stampNow() // avant nextTick + html2pdf
 */
type PrintTimestampOptions = {
  prefix?: string;
  includeSeconds?: boolean;
};

type UsePrintTimestampResult = {
  printedAt: Ref<string>;
  stampNow: (d?: Date) => string;
  clearStamp: () => void;
  format: (d?: Date) => string;
};

export function usePrintTimestamp(options: PrintTimestampOptions = {}): UsePrintTimestampResult {
  const { prefix = "Printed on", includeSeconds = false } = options;

  const printedAt = ref<string>("");

  function format(d = new Date()): string {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const sec = String(d.getSeconds()).padStart(2, "0");
    const time = includeSeconds ? `${hh}:${min}:${sec}` : `${hh}:${min}`;
    return `${prefix} ${dd}/${mm}/${yyyy} at ${time}`;
  }

  function stampNow(d = new Date()): string {
    printedAt.value = format(d);
    return printedAt.value;
  }

  function clearStamp(): void {
    printedAt.value = "";
  }

  return { printedAt, stampNow, clearStamp, format };
}
