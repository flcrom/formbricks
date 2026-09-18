import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
} from "lexical";
import {
  RECALL_FORMAT_BOLD,
  RECALL_FORMAT_ITALIC,
  RECALL_FORMAT_UNDERLINE,
  getEffectiveFirstTextFormat,
  getNextRecallFormatEnabled,
} from "./recall-format";
import { RecallNode } from "./recall-node";

export const registerRecallFormatCommand = (editor: LexicalEditor): (() => void) =>
  editor.registerCommand(
    FORMAT_TEXT_COMMAND,
    (format) => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return false;

      const recallFormat =
        format === "bold"
          ? RECALL_FORMAT_BOLD
          : format === "italic"
            ? RECALL_FORMAT_ITALIC
            : format === "underline"
              ? RECALL_FORMAT_UNDERLINE
              : 0;
      if (!recallFormat) return false;

      const nodes = selection.getNodes();
      const selectedTextNodes = nodes.filter($isTextNode);
      const startPoint = selection.isBackward() ? selection.focus : selection.anchor;
      const startTextIndex = Math.max(
        0,
        selectedTextNodes.findIndex((node) => node.getKey() === startPoint.key)
      );
      const effectiveFirstTextFormat = getEffectiveFirstTextFormat(
        selectedTextNodes.map((node) => node.getFormatFlags(format, null)),
        selectedTextNodes.map((node) => node.getTextContentSize()),
        startTextIndex,
        startPoint.type === "text" && selectedTextNodes[0] ? startPoint.offset : 0
      );
      const recallNodes = nodes.filter((node): node is RecallNode => node instanceof RecallNode);
      const enabled = getNextRecallFormatEnabled(
        recallNodes.map((node) => node.getFormat()),
        recallFormat,
        effectiveFirstTextFormat
      );
      recallNodes.forEach((node) => node.setFormat(recallFormat, enabled));
      return false;
    },
    COMMAND_PRIORITY_HIGH
  );
