# Outlook Email Links for VS Code

Convert Outlook Web message references into deep links directly in Markdown. All conversion runs locally, with no authentication or network access.

## Install

Download `outlook-email-links.vsix` from the `outlook-email-links-vsix` artifact on a successful [GitHub Actions CI run](https://github.com/apeseckis/outlook-email-link-vscode/actions/workflows/ci.yml). Unzip the artifact, then use **Extensions: Install from VSIX...** in VS Code. Requires VS Code 1.95 or newer. No Marketplace publication is configured.

## Use

- Place the cursor anywhere inside a supported URL, right-click, and choose **Convert Outlook Link**. A selection is optional.
- Select several complete URLs, even across lines, to convert them together. Partial URLs are left alone. Multiple editor selections are supported.
- Press **Ctrl+.** (**Cmd+.** on macOS) inside a supported URL and choose **Convert to Outlook Deep Link**.
- Run **Outlook Links: Convert All in Current File** from the Command Palette. The status bar displays the conversion count for five seconds.
- Use standard **Undo** to revert an operation in one step.

Commands operate only in Markdown editors. Context menu visibility follows the setting below; VS Code places the cursor at the right-click location when opening its editor context menu.

## Example

Input (synthetic message ID):

```markdown
[Evidence](https://outlook.cloud.microsoft/mail/inbox/id/SYNTHETIC_ID "Optional title")
```

Output:

```markdown
[Evidence](https://outlook.office.com/mail/deeplink/read/SYNTHETIC_ID?ItemID=SYNTHETIC_ID&exvsurl=1 "Optional title")
```

Supported source routes have the exact structure `https://outlook.cloud.microsoft/mail/FOLDER/id/MESSAGE_ID`. Folder names may contain letters, numbers, underscores, and hyphens, including `inbox`, `sentitems`, and `drafts`. Message IDs support base64 characters (`+`, `=`), URL-safe characters, and valid percent escapes. Percent escapes retain their original spelling and are never double-encoded. Encode reserved ID characters such as `/` as `%2F` in the source URL.

Source query parameters and fragments describe the Web UI and are discarded; the resulting URL uses exactly `ItemID=MESSAGE_ID&exvsurl=1`. Other hosts, account-indexed routes, missing IDs, malformed escapes, and existing deep links are left unchanged. Conversion creates a reference; accessing a message still requires the appropriate Outlook account and permissions.

Markdown link labels, escaped labels, optional titles, angle-bracket destinations, reference definitions, standalone URLs, multiple links per line, tables, and line endings are preserved. Only URL source ranges change. CommonMark parsing protects inline code, fenced code (including nested block quotes), and indented code. HTML and image nodes are also left alone. Reference links are converted at their definition, where the URL is stored. URLs in labels and titles of existing Markdown links are left unchanged.

## Settings

| Setting | Default | Behavior |
| --- | --- | --- |
| `outlookLinks.enableQuickFix` | `true` | Offer conversion via Quick Fix. |
| `outlookLinks.showContextMenu` | `true` | Show the editor context menu command. |
| `outlookLinks.showNotifications` | `false` | Show an information notification with the count after conversion commands, including zero. Bulk conversion always reports its count in the status bar. |

## Privacy

The extension makes no network requests, uses no Graph API or Outlook authentication, monitors no clipboard, and performs no automatic paste/save conversion. It does not log URLs or message IDs or send telemetry. Treat message links as sensitive; tests and documentation use synthetic IDs only. Dependency installation and downloading the VS Code test host require network access during development.

## Develop and test

Use Node.js 22 LTS and npm:

```sh
npm ci
npm run compile
npm run lint
npm test
npm run test:integration
npm run package
```

On headless Linux run the integration suite with `xvfb-run -a npm run test:integration`. It downloads a stable VS Code build into the ignored `.vscode-test/` directory and tests actual commands, Quick Fix edits, settings, multiline selections, bulk conversion, and Undo. Unit tests exercise the pure converter and Markdown source offsets. CI runs all checks and uploads a VSIX artifact without publishing or merging anything.

For interactive debugging, open this repository in VS Code, run **Tasks: Run Task → npm: compile**, then launch an Extension Development Host with `code --extensionDevelopmentPath=.`. Open a Markdown file containing synthetic links and try each command.

`src/converter.ts` contains pure URL and Markdown logic. `src/extension.ts` contains VS Code integration. The CommonMark parser is bundled with esbuild; the packaged extension needs no installed npm modules. Generated bundles, dependencies, test hosts, and VSIX files stay out of Git. Bundled third-party notices are generated during compilation and included in the VSIX.

## License

MIT; see [LICENSE](LICENSE).
