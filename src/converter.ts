import { fromMarkdown } from 'mdast-util-from-markdown';
import type { RootContent, Root } from 'mdast';

export interface Replacement { start: number; end: number; text: string }
export interface OffsetRange { start: number; end: number }

/** Preserve the raw encoded ID: URLSearchParams would double-encode percent signs. */
export function convertUrl(input: string): string | undefined {
  const match = /^https:\/\/outlook\.cloud\.microsoft\/mail\/([a-zA-Z0-9_-]+)\/id\/([a-zA-Z0-9_~%+=-]+)(?:\?[^\s#<>]*)?(?:#[^\s<>]*)?$/i.exec(input);
  if (!match || /%(?![\da-f]{2})/i.test(match[2])) return undefined;
  const id = match[2];
  const queryId = id.replace(/\+/g, '%2B');
  return `https://outlook.office.com/mail/deeplink/read/${id}?ItemID=${queryId}&exvsurl=1`;
}

/** Source offsets come from the CommonMark tree; never reserialize the document. */
export function findConversions(markdown: string): Replacement[] {
  const edits: Replacement[] = [];
  function scan(start: number, end: number): void {
    const source = markdown.slice(start, end);
    const pattern = /https:\/\/outlook\.cloud\.microsoft\/mail\/[a-zA-Z0-9_-]+\/id\/[^\s<>"'`|]+/gi;
    for (const match of source.matchAll(pattern)) {
      // Do not rewrite an Outlook-shaped substring inside another URL or word.
      if (match.index > 0 && /[\w/:%?=&+#.-]/.test(source[match.index - 1])) continue;
      // Markdown delimiters and sentence punctuation are outside a bare URL.
      const raw = match[0].replace(/[)\]},.;:!?]+$/, '');
      const text = convertUrl(raw);
      if (text) edits.push({ start: start + match.index, end: start + match.index + raw.length, text });
    }
  }
  function visit(node: Root | RootContent): void {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return;
    if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'html' || node.type === 'image') return;
    if (node.type === 'link' || node.type === 'definition') {
      // Restrict scanning to the destination, never labels or optional titles.
      const source = markdown.slice(start, end);
      let destinationStart: number | undefined;
      if (node.type === 'definition') {
        const head = /^\s*\[(?:\\.|[^\]\\])*\]:\s*<?/.exec(source);
        if (head) destinationStart = start + head[0].length;
      } else if (source.startsWith('<')) {
        destinationStart = start + 1;
      } else {
        const labelEnd = node.children.at(-1)?.position?.end.offset ?? start + 1;
        const head = /^\]\(\s*<?/.exec(markdown.slice(labelEnd, end));
        if (head) destinationStart = labelEnd + head[0].length;
      }
      if (destinationStart !== undefined) {
        const raw = /^https:\/\/[^\s<>]+/.exec(markdown.slice(destinationStart, end))?.[0];
        if (raw) scan(destinationStart, destinationStart + raw.length);
      }
      return;
    }
    if (node.type === 'text') scan(start, end);
    if ('children' in node) for (const child of node.children) visit(child as RootContent);
  }
  visit(fromMarkdown(markdown));
  return edits.sort((a, b) => a.start - b.start);
}

export function selectConversions(edits: Replacement[], ranges: OffsetRange[]): Replacement[] {
  return edits.filter(edit => ranges.some(range => range.start === range.end
    ? edit.start <= range.start && range.start < edit.end
    : range.start <= edit.start && edit.end <= range.end));
}
