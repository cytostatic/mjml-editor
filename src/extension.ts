// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, commands, window } from 'vscode';
import { Editor } from './commands/editor';
import { Beautify } from './commands/beautify';

let context: ExtensionContext;
let extensionFeatures: object[] = [];

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(extensionContext: ExtensionContext) {
    context = extensionContext;

    extensionFeatures = [
        new Editor(context),
        new Beautify(context.subscriptions),
    ];
}

// This method is called when your extension is deactivated
export function deactivate() {
    for (const feature of extensionFeatures) {
        if (typeof (feature as any).dispose === 'function') {
            (feature as any).dispose();
        }
    }

    for (const subscription of context.subscriptions) {
        subscription.dispose();
    }
}
