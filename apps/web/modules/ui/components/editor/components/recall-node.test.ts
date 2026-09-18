// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import {
  RECALL_FORMAT_BOLD,
  RECALL_FORMAT_ITALIC,
  RECALL_FORMAT_UNDERLINE,
  getEffectiveFirstTextFormat,
  getNextRecallFormatEnabled,
  getRecallFormatFromElement,
  getToolbarFormatActive,
  hasRecallFormat,
  wrapRecallElementWithFormat,
} from "./recall-format";

describe("recall node formatting", () => {
  test("reads formatting inherited by a recall token", () => {
    const strong = document.createElement("strong");
    const italic = document.createElement("em");
    const underline = document.createElement("u");
    const recall = document.createElement("span");
    underline.append(recall);
    italic.append(underline);
    strong.append(italic);

    expect(getRecallFormatFromElement(recall)).toBe(
      RECALL_FORMAT_BOLD | RECALL_FORMAT_ITALIC | RECALL_FORMAT_UNDERLINE
    );
  });

  test("exports formatting around the recall token so replacement values inherit it", () => {
    const recall = document.createElement("span");
    recall.textContent = "#recall:name/fallback:Guest#";

    const formatted = wrapRecallElementWithFormat(
      recall,
      RECALL_FORMAT_BOLD | RECALL_FORMAT_ITALIC | RECALL_FORMAT_UNDERLINE
    );

    expect(formatted.outerHTML).toBe(
      "<u><em><strong><span>#recall:name/fallback:Guest#</span></strong></em></u>"
    );
  });

  test("follows the first selected text node when formatting a mixed selection", () => {
    expect(getNextRecallFormatEnabled([0], RECALL_FORMAT_BOLD, RECALL_FORMAT_BOLD)).toBe(true);
    expect(getNextRecallFormatEnabled([0], RECALL_FORMAT_BOLD, 0)).toBe(false);
    expect(getNextRecallFormatEnabled([RECALL_FORMAT_BOLD], RECALL_FORMAT_BOLD, RECALL_FORMAT_BOLD)).toBe(
      true
    );
  });

  test("uses the recall nodes as the toggle target when no text is selected", () => {
    expect(getNextRecallFormatEnabled([0, 0], RECALL_FORMAT_BOLD)).toBe(true);
    expect(getNextRecallFormatEnabled([RECALL_FORMAT_BOLD, 0], RECALL_FORMAT_BOLD)).toBe(false);
  });

  test("keeps unformatted recall tokens unchanged", () => {
    const recall = document.createElement("span");
    expect(wrapRecallElementWithFormat(recall, 0)).toBe(recall);
  });
});

test("RecallNode JSON round-trip preserves formatting", async () => {
  const [{ RecallNode }, { createEditor, $getRoot }] = await Promise.all([
    import("./recall-node"),
    import("lexical"),
  ]);
  const serialized = {
    type: "recall" as const,
    version: 1 as const,
    recallItem: { id: "name", label: "Name", type: "element" as const },
    fallbackValue: "Guest",
    format: RECALL_FORMAT_BOLD | RECALL_FORMAT_UNDERLINE,
  };

  const editor = createEditor({ nodes: [RecallNode] });
  await new Promise<void>((resolve) => {
    editor.update(
      () => {
        const node = RecallNode.importJSON(serialized);
        $getRoot().append(node);
        expect(node.exportJSON()).toEqual(serialized);
      },
      { onUpdate: resolve }
    );
  });
});

test("formatted DOM export/import helpers round-trip all supported formats", () => {
  const marker = document.createElement("span");
  marker.dataset.recallId = "name";
  const formatted = wrapRecallElementWithFormat(
    marker,
    RECALL_FORMAT_BOLD | RECALL_FORMAT_ITALIC | RECALL_FORMAT_UNDERLINE
  );

  expect(getRecallFormatFromElement(formatted.querySelector("span")!)).toBe(
    RECALL_FORMAT_BOLD | RECALL_FORMAT_ITALIC | RECALL_FORMAT_UNDERLINE
  );
});

test("skips a boundary text node when selection starts at its end", () => {
  expect(getEffectiveFirstTextFormat([0, RECALL_FORMAT_BOLD], [4, 5], 0, 4)).toBe(RECALL_FORMAT_BOLD);
  expect(getEffectiveFirstTextFormat([RECALL_FORMAT_ITALIC, 0], [4, 5], 0, 2)).toBe(RECALL_FORMAT_ITALIC);
});

test("toolbar state includes selected recall node formats", () => {
  expect(hasRecallFormat([0, RECALL_FORMAT_BOLD], RECALL_FORMAT_BOLD)).toBe(true);
  expect(hasRecallFormat([RECALL_FORMAT_BOLD], RECALL_FORMAT_ITALIC)).toBe(false);
});

test("mixed-selection toolbar follows effective first text, not a formatted recall", () => {
  expect(getToolbarFormatActive([0], [4], 0, 0, [RECALL_FORMAT_BOLD], RECALL_FORMAT_BOLD)).toBe(false);
  expect(getToolbarFormatActive([RECALL_FORMAT_BOLD], [4], 0, 0, [0], RECALL_FORMAT_BOLD)).toBe(true);
});

test("toolbar falls back to recall format when no effective text is selected", () => {
  expect(getToolbarFormatActive([], [], 0, 0, [RECALL_FORMAT_BOLD], RECALL_FORMAT_BOLD)).toBe(true);
});

test("toolbar skips a boundary text node like the format command", () => {
  expect(getToolbarFormatActive([RECALL_FORMAT_BOLD, 0], [4, 5], 0, 4, [], RECALL_FORMAT_BOLD)).toBe(false);
});

test("collapsed-caret toolbar preserves the selection pending format", () => {
  expect(getToolbarFormatActive([0], [4], 0, 2, [], RECALL_FORMAT_BOLD, true, true)).toBe(true);
  expect(getToolbarFormatActive([RECALL_FORMAT_BOLD], [4], 0, 2, [], RECALL_FORMAT_BOLD, true, false)).toBe(
    false
  );
});
