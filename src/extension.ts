import * as vscode from 'vscode';
import { JsonSyntaxTree } from './json/json_types';
import { JsonExtension } from './extension/json-extension';

const fs = require('fs');

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "o-scad" is now active!');

	const jsonExtension = new JsonExtension();

	let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
		vscode.window.showInformationMessage("hello json");
	});

	context.subscriptions.push(disposable);


	// ============================		
	// ==== FORMATTER =============
	// ============================

	vscode.languages.registerDocumentFormattingEditProvider({ scheme: 'file', language: 'json' }, {
		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
			let tokens: JsonSyntaxTree;
			let parseTime = 0;
			let formatTime = 0;
			try {
				let start = new Date().getTime();
				tokens = jsonExtension.parse(document.getText());
				parseTime = new Date().getTime() - start;
			} catch (e) {
				console.error(e);
				vscode.window.showInformationMessage("Parse Error" + e);
				return [];
			}
			try {
				let start = new Date().getTime();
				let formatetCode = jsonExtension.format(tokens);
				formatTime = new Date().getTime() - start;
				if (formatetCode === null) {
					vscode.window.showInformationMessage("error while format: empty result");
					return [];
				} else {
					let fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
					vscode.window.showInformationMessage('SCAD parse time: ' + parseTime + 'ms, format time: ' + formatTime + 'ms');
					return [
						vscode.TextEdit.replace(fullRange, formatetCode)
					];
				}
			} catch (e) {
				console.error(e);
				vscode.window.showInformationMessage("error while format:" + e);
				return [];
			}
		}
	});

	// ==========================		
	// ==== COMANDS =============
	// ==========================


}


// this method is called when your extension is deactivated
export function deactivate() { }

