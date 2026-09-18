// @vitest-environment jsdom
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  FORMAT_TEXT_COMMAND,
  createEditor,
} from "lexical";
import { beforeEach, describe, expect, test } from "vitest";
import { RECALL_FORMAT_BOLD } from "./recall-format";
import { registerRecallFormatCommand } from "./recall-format-command";
import { $createRecallNode, RecallNode } from "./recall-node";

const createTestEditor = () => {
  const editor = createEditor({ nodes: [RecallNode] });
  editor.setRootElement(document.createElement("div"));
  registerRecallFormatCommand(editor);
  return editor;
};

const seed = (editor: ReturnType<typeof createTestEditor>) =>
  new Promise<void>((resolve) =>
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        const first = $createTextNode("left");
        const recall = $createRecallNode({ recallItem: { id: "name", label: "Name", type: "element" } });
        const last = $createTextNode("right");
        paragraph.append(first, recall, last);
        $getRoot().append(paragraph);
      },
      { onUpdate: resolve }
    )
  );

const readNodes = (editor: ReturnType<typeof createTestEditor>) =>
  editor.getEditorState().read(() => {
    const [paragraph] = $getRoot().getChildren();
    return paragraph.getChildren() as [
      ReturnType<typeof $createTextNode>,
      RecallNode,
      ReturnType<typeof $createTextNode>,
    ];
  });

describe("recall format command wiring", () => {
  let editor: ReturnType<typeof createTestEditor>;
  beforeEach(async () => {
    editor = createTestEditor();
    await seed(editor);
  });

  test("formats a recall-only selection", async () => {
    await new Promise<void>((resolve) =>
      editor.update(
        () => {
          const [, recall] = readNodes(editor);
          recall.selectNext();
          const selection = $getSelection();
          if ($isRangeSelection(selection)) selection.insertNodes([recall]);
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        },
        { onUpdate: resolve }
      )
    );
    expect(readNodes(editor)[1].getFormat() & RECALL_FORMAT_BOLD).toBe(RECALL_FORMAT_BOLD);
  });

  test("mixed and boundary selections follow Lexical's first effective text", async () => {
    await new Promise<void>((resolve) =>
      editor.update(
        () => {
          const [first, , last] = readNodes(editor);
          first.setFormat(RECALL_FORMAT_BOLD);
          const selection = $createRangeSelection();
          selection.setTextNodeRange(first, first.getTextContentSize(), last, last.getTextContentSize());
          $setSelection(selection);
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        },
        { onUpdate: resolve }
      )
    );
    expect(readNodes(editor)[1].getFormat() & RECALL_FORMAT_BOLD).toBe(RECALL_FORMAT_BOLD);
  });

  test("collapsed selection does not mutate a recall node", async () => {
    await new Promise<void>((resolve) =>
      editor.update(
        () => {
          const [first] = readNodes(editor);
          first.select(2, 2);
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        },
        { onUpdate: resolve }
      )
    );
    expect(readNodes(editor)[1].getFormat()).toBe(0);
  });

  test("actual Lexical HTML export/import preserves formatted recall markup", async () => {
    let html = "";
    await new Promise<void>((resolve) =>
      editor.update(
        () => {
          const [, recall] = readNodes(editor);
          recall.setFormat(RECALL_FORMAT_BOLD, true);
          html = $generateHtmlFromNodes(editor);
        },
        { onUpdate: resolve }
      )
    );
    expect(html).toContain("<strong>");

    const imported = createTestEditor();
    await new Promise<void>((resolve) =>
      imported.update(
        () => {
          const dom = new DOMParser().parseFromString(html, "text/html");
          $getRoot().append(...$generateNodesFromDOM(imported, dom));
        },
        { onUpdate: resolve }
      )
    );
    imported.getEditorState().read(() => {
      const [paragraph] = $getRoot().getChildren();
      const recall = paragraph.getChildren().find((node) => node instanceof RecallNode) as RecallNode;
      expect(recall.getFormat() & RECALL_FORMAT_BOLD).toBe(RECALL_FORMAT_BOLD);
    });
  });
});
