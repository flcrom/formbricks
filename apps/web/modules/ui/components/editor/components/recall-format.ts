export const RECALL_FORMAT_BOLD = 1;
export const RECALL_FORMAT_ITALIC = 2;
export const RECALL_FORMAT_UNDERLINE = 8;

export const getRecallFormatFromElement = (element: HTMLElement): number => {
  let format = 0;
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const tag = current.tagName.toLowerCase();
    if (tag === "strong" || tag === "b") format |= RECALL_FORMAT_BOLD;
    if (tag === "em" || tag === "i") format |= RECALL_FORMAT_ITALIC;
    if (tag === "u") format |= RECALL_FORMAT_UNDERLINE;
  }
  return format;
};

export const wrapRecallElementWithFormat = (element: HTMLElement, format: number): HTMLElement => {
  let root = element;
  const wrap = (tag: "strong" | "em" | "u") => {
    const wrapper = document.createElement(tag);
    wrapper.append(root);
    root = wrapper;
  };
  if (format & RECALL_FORMAT_BOLD) wrap("strong");
  if (format & RECALL_FORMAT_ITALIC) wrap("em");
  if (format & RECALL_FORMAT_UNDERLINE) wrap("u");
  return root;
};

export const getNextRecallFormatEnabled = (
  recallFormats: number[],
  format: number,
  firstTextNextFormat?: number
): boolean =>
  firstTextNextFormat === undefined
    ? !recallFormats.some((recallFormat) => (recallFormat & format) !== 0)
    : (firstTextNextFormat & format) !== 0;

export const getEffectiveFirstTextFormat = (
  textFormats: number[],
  textSizes: number[],
  startTextIndex: number,
  startOffset: number
): number | undefined => {
  const index = startOffset === textSizes[startTextIndex] ? startTextIndex + 1 : startTextIndex;
  return textFormats[index];
};

export const hasRecallFormat = (recallFormats: number[], format: number): boolean =>
  recallFormats.some((recallFormat) => (recallFormat & format) !== 0);

export const getToolbarFormatActive = (
  textFormats: number[],
  textSizes: number[],
  startTextIndex: number,
  startOffset: number,
  recallFormats: number[],
  format: number,
  isCollapsed = false,
  collapsedSelectionActive = false
): boolean => {
  if (isCollapsed) return collapsedSelectionActive;
  const effectiveTextFormat = getEffectiveFirstTextFormat(
    textFormats,
    textSizes,
    startTextIndex,
    startOffset
  );
  return effectiveTextFormat === undefined
    ? hasRecallFormat(recallFormats, format)
    : (effectiveTextFormat & format) !== 0;
};
