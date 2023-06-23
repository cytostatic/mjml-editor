import { basename, join } from 'path';
import { writeFileSync } from 'fs';
import { Disposable, ExtensionContext, TextDocument, TextDocumentChangeEvent, TextEditor, Uri, ViewColumn, WebviewPanel, commands, window, workspace } from "vscode";
import getNonce, { isMJMLFile } from "../utils/helper";

export class Editor {
    private openedDocument: TextDocument | null = null;
    private editorOpen: boolean = false;
    private subscriptions: Disposable[];
    private webview: WebviewPanel | undefined;

    constructor(private context: ExtensionContext) {
        this.subscriptions = this.context.subscriptions;

        this.subscriptions.push(
            commands.registerCommand('mjml-editor.openFile', () => {
                if (window.activeTextEditor) {
                    this.editorOpen = true;
                    this.displayWebView(window.activeTextEditor.document);
                } else {
                    window.showErrorMessage("Active editor doesn't show a MJML document.");
                }
            }),

            commands.registerCommand('mjml-editor.saveFile', () => {
                if (this.openedDocument) {
                    const content = '';
                    writeFileSync(this.openedDocument.fileName, content, 'utf8');
                } else {
                    window.showErrorMessage("MJML Editor is not open.");
                }
            }),

            // workspace.onDidOpenTextDocument((document?: TextDocument) => {
            //     if (
            //         document &&
            //         this.editorOpen
            //     ) {
            //         this.displayWebView(document);
            //     }
            // }),

            // window.onDidChangeActiveTextEditor((editor?: TextEditor) => {
            //     if (editor && this.editorOpen) {
            //         this.displayWebView(editor.document);
            //     }
            // }),

            // workspace.onDidChangeTextDocument((event?: TextDocumentChangeEvent) => {
            //     if (
            //         event &&
            //         this.editorOpen
            //     ) {
            //         this.displayWebView(event.document);
            //     }
            // }),

            // workspace.onDidSaveTextDocument((document?: TextDocument) => {
            //     if (document && this.editorOpen) {
            //         this.displayWebView(document);
            //     }
            // }),

            workspace.onDidCloseTextDocument((document?: TextDocument) => {
                if (document && this.editorOpen && this.webview) {
                    if (this.openedDocument?.fileName === document.fileName) {
                        this.dispose();
                    }
                }
            }),
        );
    }

    public dispose(): void {
        if (this.webview !== undefined) {
            this.webview.dispose();
        }
    }

    private displayWebView(document: TextDocument): void {
        if (!isMJMLFile(document)) {
            return;
        }

        const activeTextEditor: TextEditor | undefined = window.activeTextEditor;
        if (!activeTextEditor || !activeTextEditor.document) {
            return;
        }

        const label: string = `MJML Editor - ${basename(activeTextEditor.document.fileName)}`;

        if (this.webview) {
            return;
        }

        commands.executeCommand('setContext', 'mjmlEditorVisible', true);

        this.webview = window.createWebviewPanel('mjml-editor', label, ViewColumn.Active, {
            retainContextWhenHidden: true,
            enableScripts: true,
        });

        this.webview.onDidDispose(
            () => {
                this.webview = undefined;
                this.editorOpen = false;
                this.openedDocument = null;
                commands.executeCommand('setContext', 'mjmlEditorVisible', false);
            },
            null,
            this.subscriptions,
        );
        
        this.webview.webview.html = this.getWebviewContent();

        const fileContent: string = this.getFileContent(document);

        this.webview.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'fetchFileContent':
                        this.webview?.webview.postMessage({ 
                            command: 'sendFileContent', 
                            content: fileContent, 
                        });
                        break;
                    default:
                        break;
                }
            },
            undefined,
            this.subscriptions,
        );
    }

    private getWebviewContent() {
        if (!this.webview) {
            return '';
        }

        const reactPath = Uri.file(join(__dirname, 'bundle.js'));
        const reactUri = this.webview.webview.asWebviewUri(reactPath);

        const nonce = getNonce();

        return /*html*/`
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="X-UA-Compatible" content="IE=edge">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet">
                    <link rel="preconnect" href="https://stijndv.com">
                    <link rel="stylesheet" href="https://stijndv.com/fonts/Eudoxus-Sans.css">
                    <title>Vscode Extension</title>
                </head>
                <body style="overflow: hidden;">
                    <div id="app"></div>
                </body>
                <script nonce="${nonce}" src="${reactUri}"></script>
            </html>
        `;
    }

    private getFileContent(document: TextDocument): string {
        const mjml: string = this.wrapInMjmlTemplate(document.getText());

        if (mjml) {
            this.openedDocument = document;
            return mjml;
        }

        return this.error("Active editor doesn't show a MJML document.");
    }

    private wrapInMjmlTemplate(documentText: string): string {
        if (documentText.trim().startsWith('<mjml')) {
            return documentText;
        }

        return "<mjml><mj-body>" + documentText + "</mj-body></mjml>";
    }

    private error(error: string): string {
        return `<body>${error}</body>`;
    }
}