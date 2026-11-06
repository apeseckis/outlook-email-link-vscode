import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const url = 'https://outlook.cloud.microsoft/mail/inbox/id/SYNTHETIC_ID';
const deep = 'https://outlook.office.com/mail/deeplink/read/SYNTHETIC_ID?ItemID=SYNTHETIC_ID&exvsurl=1';

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('apeseckis.outlook-email-links');
  assert.ok(extension);
  await extension.activate();
  async function open(content: string): Promise<vscode.TextEditor> {
    return vscode.window.showTextDocument(await vscode.workspace.openTextDocument({ language: 'markdown', content }));
  }
  const source = `[Evidence](${url} "Title")\n${url}\n\`${url}\``;
  const editor = await open(source);
  const cursor = editor.document.positionAt(source.indexOf(url) + 15);
  editor.selection = new vscode.Selection(cursor, cursor);
  await vscode.commands.executeCommand('outlookLinks.convertAtCursor');
  assert.equal(editor.document.getText(), source.replace(url, deep));
  await vscode.commands.executeCommand('undo');
  assert.equal(editor.document.getText(), source, 'cursor conversion undoes in one step');
  console.log('PASS: cursor conversion and real editor Undo');

  // The workbench invalidates code-action requests while an Undo change propagates.
  // Wait for the actual action to become available, with a bounded failure timeout.
  let action: vscode.CodeAction | undefined;
  for (let attempt = 0; attempt < 40 && !action; attempt++) {
    const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
      'vscode.executeCodeActionProvider', editor.document.uri, new vscode.Range(cursor, cursor), vscode.CodeActionKind.QuickFix.value);
    action = actions.find(item => item.title === 'Convert to Outlook Deep Link');
    if (!action) await delay(250);
  }
  assert.ok(action?.edit);
  await vscode.workspace.applyEdit(action.edit);
  assert.equal(editor.document.getText(), source.replace(url, deep));
  await vscode.commands.executeCommand('undo');
  assert.equal(editor.document.getText(), source);
  console.log('PASS: Quick Fix and Undo');

  const config = vscode.workspace.getConfiguration('outlookLinks');
  try {
    await config.update('enableQuickFix', false, vscode.ConfigurationTarget.Global);
    const disabled = await vscode.commands.executeCommand<vscode.CodeAction[]>(
      'vscode.executeCodeActionProvider', editor.document.uri, new vscode.Range(cursor, cursor), 'quickfix');
    assert.ok(!disabled.some(item => item.title === 'Convert to Outlook Deep Link'));
  } finally {
    await config.update('enableQuickFix', undefined, vscode.ConfigurationTarget.Global);
  }
  console.log('PASS: Quick Fix setting');

  editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(2, 0));
  await vscode.commands.executeCommand('outlookLinks.convertAtCursor');
  const expected = `[Evidence](${deep} "Title")\n${deep}\n\`${url}\``;
  assert.equal(editor.document.getText(), expected);
  await vscode.commands.executeCommand('undo');
  assert.equal(editor.document.getText(), source);
  console.log('PASS: multiline selection and single-step Undo');

  await vscode.commands.executeCommand('outlookLinks.convertAll');
  assert.equal(editor.document.getText(), expected);
  await vscode.commands.executeCommand('outlookLinks.convertAll');
  assert.equal(editor.document.getText(), expected);
  await vscode.commands.executeCommand('undo');
  assert.equal(editor.document.getText(), source);
  console.log('PASS: bulk conversion, code exclusion, idempotence and Undo');

  const other = await vscode.window.showTextDocument(await vscode.workspace.openTextDocument({ language: 'plaintext', content: url }));
  await vscode.commands.executeCommand('outlookLinks.convertAll');
  assert.equal(other.document.getText(), url);
  assert.equal(vscode.languages.getDiagnostics(editor.document.uri).length, 0);
  console.log('PASS: Markdown scope and no diagnostics');
}
