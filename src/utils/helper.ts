import { TextDocument } from 'vscode';

export function isMJMLFile(document: TextDocument): boolean {
    return (
        document.languageId === 'mjml' &&
        (document.uri.scheme === 'file' || document.uri.scheme === 'untitled')
    );
}

export default function getNonce() {
    let text = "";
    const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}