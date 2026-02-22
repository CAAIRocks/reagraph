const vscode = require("vscode");

const TAG_PATTERN = /!\s*(?:md|markdown|py|python|json|ts|typescript|rs|rust|bash|sh|shell|rb|ruby|diff|patch|toml)\b/;
const BLOCK_START_PATTERN = /^(\s*).*?!\s*(?:md|markdown|py|python|json|ts|typescript|rs|rust|bash|sh|shell|rb|ruby|diff|patch|toml)\s*[|>]/;
const XML_OPEN_TAG = /<([a-zA-Z][\w-]*)(?:\s[^>]*)?>/g;
const XML_CLOSE_TAG = /<\/([a-zA-Z][\w-]*)>/g;

function documentHasTags(document) {
  for (let line = 0; line < document.lineCount; line += 1) {
    if (TAG_PATTERN.test(document.lineAt(line).text)) {
      return true;
    }
  }
  return false;
}

function findEmbeddedBlocks(document) {
  const blocks = [];
  let i = 0;

  while (i < document.lineCount) {
    const lineText = document.lineAt(i).text;
    const match = BLOCK_START_PATTERN.exec(lineText);

    if (match) {
      const baseIndent = match[1].length;
      const startLine = i + 1;
      let endLine = startLine;

      const isMarkdown = /!\s*(?:md|markdown)\b/.test(lineText);

      for (let j = startLine; j < document.lineCount; j++) {
        const nextLine = document.lineAt(j).text;
        if (nextLine.trim() === "") {
          endLine = j + 1;
          continue;
        }
        const nextIndent = nextLine.match(/^(\s*)/)[1].length;
        if (nextIndent <= baseIndent) {
          break;
        }
        endLine = j + 1;
      }

      if (endLine > startLine) {
        blocks.push({
          start: startLine,
          end: endLine,
          type: isMarkdown ? "markdown" : "code"
        });
      }
      i = endLine;
    } else {
      i += 1;
    }
  }

  return blocks;
}

function findXmlTags(document, blocks) {
  const tags = [];
  const tagPairs = [];

  for (const block of blocks) {
    if (block.type !== "markdown") continue;

    for (let line = block.start; line < block.end; line += 1) {
      const lineText = document.lineAt(line).text;

      let openMatch;
      XML_OPEN_TAG.lastIndex = 0;
      while ((openMatch = XML_OPEN_TAG.exec(lineText)) !== null) {
        tags.push({
          line,
          start: openMatch.index,
          end: openMatch.index + openMatch[0].length,
          type: "open",
          tagName: openMatch[1]
        });
      }

      let closeMatch;
      XML_CLOSE_TAG.lastIndex = 0;
      while ((closeMatch = XML_CLOSE_TAG.exec(lineText)) !== null) {
        tags.push({
          line,
          start: closeMatch.index,
          end: closeMatch.index + closeMatch[0].length,
          type: "close",
          tagName: closeMatch[1]
        });
      }
    }
  }

  const openStack = [];
  for (const tag of tags) {
    if (tag.type === "open") {
      openStack.push(tag);
    } else if (tag.type === "close") {
      for (let i = openStack.length - 1; i >= 0; i -= 1) {
        if (openStack[i].tagName === tag.tagName) {
          tagPairs.push({
            open: openStack[i],
            close: tag
          });
          openStack.splice(i, 1);
          break;
        }
      }
    }
  }

  return { tags, tagPairs };
}

function getConfig(key, defaultValue) {
  return vscode.workspace.getConfiguration("b2emo.decorations").get(key, defaultValue);
}

function runBeeCommand() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const workspacePath = workspaceFolder?.uri.fsPath;
  const terminalName = "Bee";
  let terminal = vscode.window.terminals.find((term) => term.name === terminalName);

  if (!terminal) {
    terminal = vscode.window.createTerminal({
      name: terminalName,
      cwd: workspacePath
    });
  }

  terminal.show(true);

  if (workspacePath) {
    terminal.sendText(`cd "${workspacePath}"`, true);
  }

  terminal.sendText("bee run", true);
}

function activate(context) {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.name = "B2EMO YAML";

  const runBee = vscode.commands.registerCommand("b2emo.run", runBeeCommand);

  let codeBlockDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: getConfig("codeBlockBackground", "rgba(0, 0, 0, 0.15)"),
    isWholeLine: true
  });

  let markdownBlockDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: getConfig("markdownBlockBackground", "rgba(30, 60, 90, 0.15)"),
    isWholeLine: true
  });

  let xmlTagDecoration = vscode.window.createTextEditorDecorationType({
    color: getConfig("xmlTagColor", "#e06c75"),
    fontWeight: "bold"
  });

  let xmlContentDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: getConfig("xmlContentBackground", "rgba(224, 108, 117, 0.08)"),
    isWholeLine: true
  });

  const recreateDecorations = () => {
    codeBlockDecoration.dispose();
    markdownBlockDecoration.dispose();
    xmlTagDecoration.dispose();
    xmlContentDecoration.dispose();

    codeBlockDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: getConfig("codeBlockBackground", "rgba(0, 0, 0, 0.15)"),
      isWholeLine: true
    });

    markdownBlockDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: getConfig("markdownBlockBackground", "rgba(30, 60, 90, 0.15)"),
      isWholeLine: true
    });

    xmlTagDecoration = vscode.window.createTextEditorDecorationType({
      color: getConfig("xmlTagColor", "#e06c75"),
      fontWeight: "bold"
    });

    xmlContentDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: getConfig("xmlContentBackground", "rgba(224, 108, 117, 0.08)"),
      isWholeLine: true
    });

    if (vscode.window.activeTextEditor) {
      updateDecorations(vscode.window.activeTextEditor);
    }
  };

  const updateDecorations = (editor) => {
    if (!editor || editor.document.languageId !== "yaml") {
      return;
    }

    const blocks = findEmbeddedBlocks(editor.document);
    const codeRanges = [];
    const markdownRanges = [];

    for (const block of blocks) {
      const range = new vscode.Range(
        new vscode.Position(block.start, 0),
        new vscode.Position(block.end - 1, editor.document.lineAt(block.end - 1).text.length)
      );

      if (block.type === "markdown") {
        markdownRanges.push(range);
      } else {
        codeRanges.push(range);
      }
    }

    editor.setDecorations(codeBlockDecoration, codeRanges);
    editor.setDecorations(markdownBlockDecoration, markdownRanges);

    const { tags, tagPairs } = findXmlTags(editor.document, blocks);

    const tagRanges = tags.map((tag) =>
      new vscode.Range(
        new vscode.Position(tag.line, tag.start),
        new vscode.Position(tag.line, tag.end)
      )
    );
    editor.setDecorations(xmlTagDecoration, tagRanges);

    const contentRanges = [];
    for (const pair of tagPairs) {
      const startLine = pair.open.line;
      const endLine = pair.close.line;

      if (startLine === endLine) {
        contentRanges.push(
          new vscode.Range(
            new vscode.Position(startLine, pair.open.end),
            new vscode.Position(endLine, pair.close.start)
          )
        );
      } else {
        for (let line = startLine; line <= endLine; line += 1) {
          contentRanges.push(
            new vscode.Range(
              new vscode.Position(line, 0),
              new vscode.Position(line, editor.document.lineAt(line).text.length)
            )
          );
        }
      }
    }
    editor.setDecorations(xmlContentDecoration, contentRanges);
  };

  const updateStatus = (editor) => {
    if (!editor || editor.document.languageId !== "yaml") {
      status.hide();
      return;
    }

    const hasTags = documentHasTags(editor.document);
    status.text = hasTags ? "B2EMO YAML: tags" : "B2EMO YAML: on";
    status.tooltip = hasTags
      ? "B2EMO YAML active (tagged blocks found)"
      : "B2EMO YAML active (no tagged blocks found)";
    status.show();

    updateDecorations(editor);
  };

  context.subscriptions.push(
    status,
    runBee,
    vscode.window.onDidChangeActiveTextEditor(updateStatus),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document === vscode.window.activeTextEditor?.document) {
        updateStatus(vscode.window.activeTextEditor);
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("b2emo.decorations")) {
        recreateDecorations();
      }
    })
  );

  updateStatus(vscode.window.activeTextEditor);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
