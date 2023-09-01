import { basename, dirname, join } from 'path';
import { writeFileSync, readFileSync } from 'fs';
import { Disposable, ExtensionContext, TextDocument, TextDocumentChangeEvent, TextEditor, Uri, ViewColumn, WebviewPanel, commands, window, workspace } from 'vscode';
import getNonce, { beautifyHTML, isMJMLFile } from '../utils/helper';
import Logger from '../utils/logger';
import { Events } from '../types/EventTypes';
import { MessageHandlerData } from '@estruyf/vscode';
import { getType } from 'mime';

export class Editor {
    private openedDocument: TextDocument | null = null;
    private editorOpen: boolean = false;
    private subscriptions: Disposable[];
    private webview: WebviewPanel | undefined;

    constructor(private context: ExtensionContext) {
        this.subscriptions = this.context.subscriptions;

        Logger.info('MJML Editor activated.');
        this.subscriptions.push(
            commands.registerCommand('mjml-editor.openFile', () => {
                if (window.activeTextEditor) {
                    this.editorOpen = true;
                    this.displayWebView(window.activeTextEditor.document);

                } else {
                    Logger.error('Active editor doesn\'t show a MJML document.');
                }
            }),

            commands.registerCommand('mjml-editor.saveFile', () => {
                if (this.openedDocument) {
                    this.webview?.webview.postMessage({
                        command: Events.GetEditorContent,
                    } as MessageHandlerData<void>);

                } else {
                    Logger.error('MJML Editor is not open.');
                }
            }),

            workspace.onDidSaveTextDocument((document?: TextDocument) => {
                if (document && this.editorOpen && this.webview) {
                    if (this.openedDocument?.fileName === document.fileName) {
                        this.dispose();
                    }
                }
            }),

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

        this.webview.iconPath = Uri.joinPath(this.context.extensionUri, 'assets', 'icon.svg');

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
                const { command, requestId, payload } = message;

                switch (command) {
                    case Events.FetchFileContent:
                        this.webview?.webview.postMessage({
                            command,
                            requestId,
                            payload: fileContent,
                        } as MessageHandlerData<string>);
                        break;

                    case Events.GetEditorContent:
                        if (!this.openedDocument) {
                            break;
                        }

                        const mjml = beautifyHTML(payload);
                        if (mjml) {
                            writeFileSync(this.openedDocument.fileName, mjml, 'utf8');
                            Logger.info(`MJML content saved to file "${this.openedDocument.fileName}".`);
                            this.dispose();
                        }
                        break;

                    case Events.FetchImage:
                        let path = payload;
                        if (!payload.startsWith('/')) {
                            const basePath = dirname(document.uri.fsPath);
                            path = join(basePath, payload);
                        }

                        try {
                            const buffer = readFileSync(path);
                            if (!buffer) {
                                throw new Error('File empty found');
                            }

                            const mime = getType(path) || 'image/png';
                            const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

                            this.webview?.webview.postMessage({
                                command,
                                requestId,
                                payload: dataUrl,
                            } as MessageHandlerData<string>);

                        } catch (error) {
                            Logger.error(`Error while fetching image: ${path}`, error);
                            this.webview?.webview.postMessage({
                                command,
                                requestId,
                                error: error,
                            } as MessageHandlerData<Buffer>);
                        }
                        break;

                    case Events.Logging:
                        Logger.log(payload.level, payload.message, payload.data);
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
                    <meta http-equiv="Content-Security-Policy"
                        content="default-src 'none'; img-src ${this.webview.webview.cspSource} https: data: blob: file: cid:; script-src ${this.webview.webview.cspSource}; style-src 'self' 'unsafe-inline' ${this.webview.webview.cspSource} https://fonts.googleapis.com https://stijndv.com; font-src * 'unsafe-inline' data:;"
                    />
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet">
                    <link rel="preconnect" href="https://stijndv.com">
                    <link rel="stylesheet" href="https://stijndv.com/fonts/Eudoxus-Sans.css">
                    <title>Vscode Extension</title>
                </head>
                <body>
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

        return this.error('Active editor doesn\'t show a MJML document.');
    }

    private wrapInMjmlTemplate(documentText: string): string {
        if (documentText.trim().startsWith('<mjml')) {
            return documentText;
        }

        return '<mjml><mj-body>' + documentText + '</mj-body></mjml>';
    }

    private error(error: string): string {
        return `<body>${error}</body>`;
    }
}