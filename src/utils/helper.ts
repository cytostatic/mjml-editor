import { TextDocument, window, workspace } from 'vscode';
import { html as jsBeautify } from 'js-beautify';

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

export function beautifyHTML(mjml: string): string | undefined {
    try {
        const replaced: string = mjml.replace(
            new RegExp(/<.*mj-style[^>]*>(?:[^<>]+)<.*\/.*mj-style>/, 'gmi'),
            (style: string): string => {
                return style.replace(/mj-style/gi, 'style');
            },
        );

        const beautified: string = jsBeautify(replaced, workspace.getConfiguration('mjml-editor').beautify);

        if (replaced !== mjml) {
            return beautified.replace(
                new RegExp(/<.*style[^>]*>(?:[^<>]+)<.*\/.*style>/, 'gmi'),
                (styleBlock: string): string => {
                    return styleBlock.replace(
                        new RegExp(/<.*style.*>/, 'gi'),
                        (style: string): string => {
                            return style.replace('style', 'mj-style');
                        },
                    );
                },
            );
        }

        return beautified;

    } catch (error: any) {
        window.showErrorMessage(error);

        return;
    }
}