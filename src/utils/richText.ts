export type RichTextToken =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "br" };

const BLOCK_BREAK_TAGS = new Set(["p", "div", "section", "article", "li"]);

function pushText(tokens: RichTextToken[], text: string, isStrong: boolean) {
  if (!text) return;
  const type = isStrong ? "strong" : "text";
  const last = tokens[tokens.length - 1];
  if (last && (last.type === "text" || last.type === "strong") && last.type === type) {
    last.text += text;
    return;
  }
  tokens.push({ type, text });
}

function pushBreak(tokens: RichTextToken[]) {
  const last = tokens[tokens.length - 1];
  if (last?.type === "br") return;
  tokens.push({ type: "br" });
}

function walkNode(tokens: RichTextToken[], node: Node, isStrong: boolean) {
  if (node.nodeType === Node.TEXT_NODE) {
    const normalized = String(node.textContent ?? "").replace(/\s+/g, " ");
    if (!normalized.trim()) return;
    pushText(tokens, normalized, isStrong);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as Element;
  const tag = element.tagName.toLowerCase();

  if (tag === "br") {
    pushBreak(tokens);
    return;
  }

  const nextIsStrong = isStrong || tag === "strong" || tag === "b";
  for (const child of Array.from(element.childNodes)) {
    walkNode(tokens, child, nextIsStrong);
  }

  if (BLOCK_BREAK_TAGS.has(tag)) {
    pushBreak(tokens);
  }
}

function trimTextBoundaries(tokens: RichTextToken[]) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token || (token.type !== "text" && token.type !== "strong")) continue;

    if (i === 0 || tokens[i - 1]?.type === "br") {
      token.text = token.text.replace(/^\s+/, "");
    }

    if (i === tokens.length - 1 || tokens[i + 1]?.type === "br") {
      token.text = token.text.replace(/\s+$/, "");
    }
  }

  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token?.type === "text" || token?.type === "strong") {
      if (!token.text) tokens.splice(i, 1);
    }
  }
}

export function parseTrustedRichText(input: string): RichTextToken[] {
  const raw = String(input ?? "");
  if (!raw.trim()) return [];

  const doc = new DOMParser().parseFromString(`<div>${raw}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return [];

  const tokens: RichTextToken[] = [];
  for (const child of Array.from(root.childNodes)) {
    walkNode(tokens, child, false);
  }

  while (tokens[0]?.type === "br") {
    tokens.shift();
  }
  while (tokens[tokens.length - 1]?.type === "br") {
    tokens.pop();
  }

  trimTextBoundaries(tokens);

  return tokens;
}

export function richTextToPlainText(input: string): string {
  const tokens = parseTrustedRichText(input);
  let output = "";
  for (const token of tokens) {
    if (token.type === "br") {
      output += "\n";
      continue;
    }
    output += token.text;
  }
  return output;
}
