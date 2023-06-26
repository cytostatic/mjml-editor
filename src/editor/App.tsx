import React, { useEffect, useRef, useState } from 'react';
import { BlockManager, BasicType, AdvancedType, JsonToMjml } from 'easy-email-core';
import { EmailEditor, EmailEditorProvider, IEmailTemplate } from 'easy-email-editor';
import { BlockAttributeConfigurationManager, ExtensionProps, MjmlToJson, StandardLayout } from 'easy-email-extensions';
import { useWindowSize } from 'react-use';

import 'easy-email-editor/lib/style.css';
import 'easy-email-extensions/lib/style.css';
import '@arco-themes/react-easy-email-theme/css/arco.css';
import './app.css';

const defaultCategories: ExtensionProps['categories'] = [
    {
        label: 'Content',
        active: true,
        blocks: [
            {
                type: AdvancedType.TEXT,
            },
            {
                type: AdvancedType.IMAGE,
                payload: { attributes: { padding: '0px 0px 0px 0px' } },
            },
            {
                type: AdvancedType.BUTTON,
            },
            {
                type: AdvancedType.DIVIDER,
            },
            {
                type: AdvancedType.SPACER,
            },
            {
                type: AdvancedType.HERO,
            },
            {
                type: AdvancedType.ACCORDION,
            },
            {
                type: AdvancedType.CAROUSEL,
            },
            {
                type: AdvancedType.SOCIAL,
            },
            {
                type: AdvancedType.WRAPPER,
            },
            {
                type: AdvancedType.GROUP,
            },
            {
                type: AdvancedType.NAVBAR,
            },
        ],
    },
    {
        label: 'Layout',
        active: true,
        displayType: 'column',
        blocks: [
            {
                title: '2 columns',
                payload: [
                    ['50%', '50%'],
                    ['33%', '67%'],
                    ['67%', '33%'],
                    ['25%', '75%'],
                    ['75%', '25%'],
                ],
            },
            {
                title: '3 columns',
                payload: [
                    ['33.33%', '33.33%', '33.33%'],
                    ['25%', '25%', '50%'],
                    ['50%', '25%', '25%'],
                ],
            },
            {
                title: '4 columns',
                payload: [['25%', '25%', '25%', '25%']],
            },
        ],
    }
];

const DefaultPageConfigPanel: any = BlockAttributeConfigurationManager.get(BasicType.PAGE);
BlockAttributeConfigurationManager.add({
    [BasicType.PAGE]: () => (
        <DefaultPageConfigPanel
            hideSubject
            hideSubTitle
        />
    ),
});

const App: React.FC = () => {
    const [theme, setTheme] = useState<string>('dark'); // ['light', 'dark'
    const [mjml, setMjml] = useState<IEmailTemplate | null>(null);
    const formRef: React.MutableRefObject<IEmailTemplate | null> = useRef(null);
    const { width } = useWindowSize();

    const smallScene = width < 1400;

    useEffect(() => {
        const vscode = acquireVsCodeApi();

        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'mjml-editor.sendFileContent':
                    setMjml({
                        subject: '',
                        subTitle: '',
                        content: MjmlToJson(message.content) || BlockManager.getBlockByType(BasicType.PAGE)!.create({}),
                    });
                    break;

                case 'mjml-editor.getEditorContent':
                    if (!formRef.current) {
                        break;
                    }

                    const html = JsonToMjml({
                        data: formRef.current.content,
                        mode: 'production',
                        context: formRef.current.content,
                    });

                    vscode.postMessage({
                        command: 'mjml-editor.sendEditorContent',
                        content: html
                    });
                    break;

                default:
                    break;
            };
        };
        window.addEventListener('message', messageHandler);

        vscode.postMessage({ command: 'mjml-editor.fetchFileContent' });

        applyTheme(document.body.className);
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutationRecord) {
                applyTheme((mutationRecord.target as any).className);
            });
        });

        const target = document.body;
        observer.observe(target, { attributes: true, attributeFilter: ['class'] });

        return () => {
            window.removeEventListener('message', messageHandler);
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        document.body.setAttribute('arco-theme', theme);
    }, [theme]);

    const applyTheme = (newTheme: string) => {
        var prefix = 'vscode-';
        if (newTheme.startsWith(prefix)) {
            newTheme = newTheme.substr(prefix.length);
        }

        if (newTheme === 'high-contrast') {
            newTheme = 'dark';
        }

        setTheme(newTheme);
    };

    if (!mjml) {
        return null;
    }

    return (
        <EmailEditorProvider
            data={mjml}
            height="calc(100vh - 2px)"
            autoComplete
            enabledLogic={false}
            dashed={false}
        >
            {({ values }) => {
                formRef.current = values;
                return (
                    <StandardLayout
                        compact={!smallScene}
                        categories={defaultCategories}
                        showSourceCode={false}
                        jsonReadOnly={true}
                        mjmlReadOnly={false}
                    >
                        <EmailEditor />
                    </StandardLayout>
                );
            }}
        </EmailEditorProvider>
    );
};

export default App;