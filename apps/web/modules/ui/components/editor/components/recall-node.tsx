"use client";

import type { DOMConversionMap, DOMConversionOutput, DOMExportOutput, NodeKey, Spread } from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import { ReactNode } from "react";
import { TSurveyRecallItem } from "@formbricks/types/surveys/types";
import { getTextContentWithRecallTruncated } from "@/lib/utils/recall";
import { cn } from "@/modules/ui/lib/utils";
import {
  RECALL_FORMAT_BOLD,
  RECALL_FORMAT_ITALIC,
  RECALL_FORMAT_UNDERLINE,
  getRecallFormatFromElement,
  wrapRecallElementWithFormat,
} from "./recall-format";

export interface RecallPayload {
  recallItem: TSurveyRecallItem;
  fallbackValue?: string;
  format?: number;
  key?: NodeKey;
}

export interface SerializedRecallNode extends Spread<RecallPayload, { type: "recall"; version: 1 }> {}

const convertRecallElement = (domNode: Node): null | DOMConversionOutput => {
  const element = domNode as HTMLElement;
  if (element.dataset.recallId) {
    const recallId = element.dataset.recallId;
    const recallLabel = element.dataset.recallLabel;
    const recallType = element.dataset.recallType;
    const fallbackValue = element.dataset.fallbackValue || "";

    if (recallId && recallLabel && recallType) {
      const recallItem: TSurveyRecallItem = {
        id: recallId,
        label: recallLabel,
        type: recallType as TSurveyRecallItem["type"],
      };

      const node = $createRecallNode({
        recallItem,
        fallbackValue,
        format: getRecallFormatFromElement(element),
      });
      return { node };
    }
  }
  return null;
};

export class RecallNode extends DecoratorNode<ReactNode> {
  __recallItem: TSurveyRecallItem;
  __fallbackValue: string;
  __format: number;

  static readonly $config = {
    type: "recall",
    inline: true,
  } as const;

  static getType(): string {
    return RecallNode.$config.type;
  }

  static clone(node: RecallNode): RecallNode {
    return new RecallNode(
      {
        recallItem: node.__recallItem,
        fallbackValue: node.__fallbackValue,
        format: node.__format,
      },
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedRecallNode): RecallNode {
    const { recallItem, fallbackValue, format } = serializedNode;
    return $createRecallNode({ recallItem, fallbackValue, format });
  }

  exportJSON(): SerializedRecallNode {
    return {
      recallItem: this.__recallItem,
      fallbackValue: this.__fallbackValue,
      format: this.__format,
      type: "recall",
      version: 1,
    };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: () => ({
        conversion: convertRecallElement,
        priority: 1,
      }),
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.dataset.recallId = this.__recallItem.id;
    element.dataset.recallLabel = this.__recallItem.label;
    element.dataset.recallType = this.__recallItem.type;
    element.dataset.fallbackValue = this.__fallbackValue;
    element.className = "recall-node";
    element.textContent = `#recall:${this.__recallItem.id}/fallback:${this.__fallbackValue}#`;
    return { element: wrapRecallElementWithFormat(element, this.__format) };
  }

  constructor(payload?: RecallPayload, key?: NodeKey) {
    super(key);
    const defaultPayload: RecallPayload = {
      recallItem: { id: "", label: "", type: "element" },
      fallbackValue: "",
      format: 0,
    };
    const actualPayload = payload || defaultPayload;
    this.__recallItem = actualPayload.recallItem;
    this.__fallbackValue = actualPayload.fallbackValue || "";
    this.__format = actualPayload.format || 0;
  }

  createDOM(): HTMLElement {
    const dom = document.createElement("span");
    dom.className = "recall-node-placeholder";
    // Don't set text content here - let decorate() handle it
    return dom;
  }

  updateDOM(_prevNode: RecallNode): boolean {
    // Return false - let decorate() handle all rendering
    return false;
  }

  getRecallItem(): TSurveyRecallItem {
    return this.__recallItem;
  }

  getFallbackValue(): string {
    return this.__fallbackValue;
  }

  setFallbackValue(fallbackValue: string): void {
    const writable = this.getWritable();
    writable.__fallbackValue = fallbackValue;
  }

  getFormat(): number {
    return this.__format;
  }

  setFormat(format: number, enabled: boolean): void {
    const writable = this.getWritable();
    writable.__format = enabled ? writable.__format | format : writable.__format & ~format;
  }

  setRecallItemLabel(label: string): void {
    const writable = this.getWritable();
    writable.__recallItem = { ...writable.__recallItem, label };
  }

  getTextContent(): string {
    return `#recall:${this.__recallItem.id}/fallback:${this.__fallbackValue}#`;
  }

  decorate(): ReactNode {
    const displayLabel = getTextContentWithRecallTruncated(this.__recallItem.label);

    return (
      <span
        className={cn(
          "recall-node z-30 inline-flex h-fit justify-center rounded-md bg-slate-100 text-sm whitespace-nowrap text-slate-700",
          {
            "font-bold": Boolean(this.__format & RECALL_FORMAT_BOLD),
            italic: Boolean(this.__format & RECALL_FORMAT_ITALIC),
            underline: Boolean(this.__format & RECALL_FORMAT_UNDERLINE),
          }
        )}
        aria-label={`Recall: ${displayLabel}`}
        title={displayLabel}>
        @{displayLabel}
      </span>
    );
  }

  isInline(): boolean {
    return RecallNode.$config.inline;
  }
}

export const $createRecallNode = (payload: RecallPayload): RecallNode => {
  return $applyNodeReplacement(new RecallNode(payload));
};
