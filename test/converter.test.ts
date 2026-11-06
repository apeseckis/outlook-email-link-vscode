import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertUrl, findConversions, selectConversions } from '../src/converter.js';

const url = 'https://outlook.cloud.microsoft/mail/inbox/id/SYNTHETIC_ID';
const deep = 'https://outlook.office.com/mail/deeplink/read/SYNTHETIC_ID?ItemID=SYNTHETIC_ID&exvsurl=1';
function apply(source: string): string {
  return findConversions(source).reverse().reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), source);
}
for (const folder of ['inbox', 'sentitems', 'drafts', 'SYNTHETIC_FOLDER']) {
  test(`converts ${folder}`, () => assert.equal(convertUrl(url.replace('inbox', folder)), deep));
}
test('preserves percent encoding and base64 characters', () => {
  const id = 'SYNTHETIC%2fID%2B%3D+==';
  assert.equal(convertUrl(url.replace('SYNTHETIC_ID', id)), `https://outlook.office.com/mail/deeplink/read/${id}?ItemID=${id.replace('+', '%2B')}&exvsurl=1`);
});
for (const source of [
  `[Evidence](${url} "Optional title")`,
  `[Evidence](${url} 'Optional title')`,
  `[Evidence](${url} "Title with ]( punctuation")`,
  `[**Rich** \`[label]\`](${url})`,
  `[](${url})`,
  `[Escaped \\[label\\]](<${url}> "Title")`,
  `Before ${url}. After`,
  `${url} and [Second](${url})`,
  `| Evidence | Reference |\n| --- | --- |\n| One | [mail](${url}) |`,
  `<${url}>`,
  `[ref]: ${url} "Title"\n\n[Evidence][ref]`,
  `😀 Evidence\r\n[mail](${url})\r\n`,
]) {
  test(`preserves formatting: ${source.slice(0, 32)}`, () => assert.equal(apply(source), source.replaceAll(url, deep)));
}
test('discards source UI query and fragment, inserts canonical parameters', () => {
  assert.equal(convertUrl(`${url}?view=synthetic&foo=bar#anchor`), deep);
  assert.equal(apply(`[mail](${url}?view=synthetic "title")`), `[mail](${deep} "title")`);
});
for (const source of [deep, 'https://example.com/mail/inbox/id/SYNTHETIC_ID',
  url.replace('https:', 'http:'), url.replace('/id/', '/other/'), `${url}/extra`,
  url.replace('SYNTHETIC_ID', 'BAD%ZZ'), url.replace('microsoft/', 'microsoft.evil/'),
  url.replace('microsoft/', 'microsoft:443/'), url.replace('inbox/id/', 'id/')]) {
  test(`rejects unsupported format ${source}`, () => assert.equal(convertUrl(source), undefined));
}
for (const source of [
  `\`${url}\``, `\`\`code \` ${url}\`\``, `\`\`\`md\n${url}\n\`\`\``,
  `~~~\n${url}\n~~~`, `    ${url}`, `> \`\`\`\n> ${url}\n> \`\`\``,
  `<!-- ${url} -->`, `[label](${deep} "${url}")`, `[${url}](${deep})`,
  `https://example.com/?next=${url}`, `prefix${url}`,
]) {
  test(`protects code, HTML and labels ${source.slice(0, 24)}`, () => assert.equal(apply(source), source));
}
test('finds only convertible text outside code', () => {
  assert.equal(apply(`\`${url}\` and ${url}`), `\`${url}\` and ${deep}`);
});
test('cursor inside URL, start boundary and end boundary', () => {
  const edits = findConversions(`prefix ${url}`);
  assert.equal(selectConversions(edits, [{ start: 12, end: 12 }]).length, 1);
  assert.equal(selectConversions(edits, [{ start: 7, end: 7 }]).length, 1);
  assert.equal(selectConversions(edits, [{ start: 7 + url.length, end: 7 + url.length }]).length, 0);
});
test('multiline selection only includes complete URLs', () => {
  const source = `${url}\n${url}\n${url}`;
  const edits = findConversions(source);
  assert.equal(selectConversions(edits, [{ start: 0, end: url.length * 2 + 1 }]).length, 2);
  assert.equal(selectConversions(edits, [{ start: 1, end: url.length - 1 }]).length, 0);
  assert.equal(selectConversions(edits, [{ start: 0, end: source.length }, { start: 0, end: 0 }]).length, 3);
});
test('repeated conversion is idempotent', () => {
  const once = apply(`${url} [mail](${url})`);
  assert.equal(apply(once), once);
  assert.deepEqual(findConversions(once), []);
});
