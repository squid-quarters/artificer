import type { Diagnostic, Template, Validation } from "#lib/model.ts";

// Measures the actual DOM at its logical preview size. This is not print preflight.
export async function measure(body: HTMLElement, template: Template): Promise<Validation> {
  await document.fonts.ready;
  for (const image of Array.from(body.closest("article")?.querySelectorAll("img") ?? [])) {
    await image.decode();
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const bounds = body.getBoundingClientRect();
  const diagnostics: Diagnostic[] = [];
  const article = body.closest("article");
  const symbol = article?.querySelector<HTMLElement>('[data-testid="shared-symbol"]');
  if (
    !article ||
    !symbol ||
    symbol.offsetLeft !== template.symbol.x ||
    symbol.offsetTop !== template.symbol.y
  ) {
    diagnostics.push({
      code: "symbol-anchor",
      regionId: "symbol",
      message: "Rendered symbol differs from the shared anchor.",
    });
  } else {
    const frame = article.getBoundingClientRect();
    const mark = symbol.getBoundingClientRect();
    if (
      mark.left < frame.left ||
      mark.top < frame.top ||
      mark.right > frame.right ||
      mark.bottom > frame.bottom
    )
      diagnostics.push({
        code: "symbol-bounds",
        regionId: "symbol",
        message: "Rendered symbol extends outside the frame.",
      });
  }

  const fontSize = Number.parseFloat(getComputedStyle(body).fontSize);
  if (fontSize < template.minFontPx)
    diagnostics.push({
      code: "font-size",
      regionId: "body",
      message: "Text is below the fixture minimum font size.",
    });
  const lines = new Map<number, string[]>();
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  let text: Node | null;
  while ((text = walker.nextNode())) {
    const content = text.textContent ?? "";
    for (const word of content.matchAll(/\S+/gu)) {
      const range = document.createRange();
      range.setStart(text, word.index!);
      range.setEnd(text, word.index! + word[0].length);
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width === 0 || rect.height === 0) continue;
        const row = Math.round(rect.top * 2) / 2;
        const words = lines.get(row) ?? [];
        if (!words.includes(`${word.index}:${word[0]}`)) words.push(`${word.index}:${word[0]}`);
        lines.set(row, words);
        if (
          rect.right > bounds.right + 0.5 ||
          rect.bottom > bounds.bottom + 0.5 ||
          rect.left < bounds.left - 0.5
        ) {
          if (!diagnostics.some((d) => d.code === "overflow"))
            diagnostics.push({
              code: "overflow",
              regionId: "body",
              message: "Rendered text extends outside the body region.",
            });
        }
      }
    }
  }
  const rows = [...lines.entries()].sort((a, b) => a[0] - b[0]);
  const finalLineWords = rows.at(-1)?.[1].length ?? 0;
  if (
    template.lastLineMinWords !== null &&
    rows.length > 1 &&
    finalLineWords < template.lastLineMinWords
  ) {
    diagnostics.push({
      code: "widow",
      regionId: "body",
      message: `Fixture requires ${template.lastLineMinWords} words on the final line.`,
    });
  }
  return {
    status: diagnostics.length ? "fail" : "pass",
    diagnostics,
    finalLineWords,
    lineCount: rows.length,
    environment: navigator.userAgent,
  };
}
