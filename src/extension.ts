import * as vscode from 'vscode';
import { findConversions, selectConversions, type Replacement } from './converter.js';

function range(document: vscode.TextDocument, edit: Replacement): vscode.Range {
  return new vscode.Range(document.positionAt(edit.start), document.positionAt(edit.end));
}

async function convert(all: boolean): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') return;
  const document = editor.document;
  const found = findConversions(document.getText());
  const edits = all ? found : selectConversions(found, editor.selections.map(selection => ({
    start: document.offsetAt(selection.start), end: document.offsetAt(selection.end)
  })));
  const applied = !edits.length || await editor.edit(builder => {
    for (const edit of edits) builder.replace(range(document, edit), edit.text);
  }, { undoStopBefore: true, undoStopAfter: true });
  const count = applied ? edits.length : 0;
  // Bulk always reports a count in the status bar; notifications remain opt-in.
  if (all) vscode.window.setStatusBarMessage(`Outlook Links: ${count} link${count === 1 ? '' : 's'} converted`, 5000);
  if (vscode.workspace.getConfiguration('outlookLinks', document).get('showNotifications', false)) {
    await vscode.window.showInformationMessage(`Outlook Links: ${count} link${count === 1 ? '' : 's'} converted.`);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('outlookLinks.convertAtCursor', () => convert(false)),
    vscode.commands.registerCommand('outlookLinks.convertAll', () => convert(true)),
    vscode.languages.registerCodeActionsProvider('markdown', {
      provideCodeActions(document, requestedRange) {
        if (!vscode.workspace.getConfiguration('outlookLinks', document).get('enableQuickFix', true)) return [];
        const offset = document.offsetAt(requestedRange.start);
        const found = selectConversions(findConversions(document.getText()), [{ start: offset, end: offset }]);
        return found.map(edit => {
          const action = new vscode.CodeAction('Convert to Outlook Deep Link', vscode.CodeActionKind.QuickFix);
          action.edit = new vscode.WorkspaceEdit();
          action.edit.replace(document.uri, range(document, edit), edit.text);
          return action;
        });
      }
    }, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] })
  );
}
