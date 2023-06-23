import React, { useEffect, useState } from 'react';
import { BlockManager, BasicType, AdvancedType } from 'easy-email-core';
import { EmailEditor, EmailEditorProvider, IEmailTemplate } from 'easy-email-editor';
import { ExtensionProps, MjmlToJson, StandardLayout } from 'easy-email-extensions';
import { useWindowSize } from 'react-use';

import 'easy-email-editor/lib/style.css';
import 'easy-email-extensions/lib/style.css';
import '@arco-themes/react-easy-email-theme/css/arco.css';

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
                type: AdvancedType.SOCIAL,
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
                type: AdvancedType.WRAPPER,
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

const App: React.FC = () => {
    const [mjml, setMjml] = useState<IEmailTemplate | null>(null);
    const { width } = useWindowSize();

    const smallScene = width < 1400;

    useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            console.log(event);
            switch (message.command) {
                case 'sendFileContent':
                    setMjml({
                        subject: 'Welcome to Easy-email',
                        subTitle: 'Nice to meet you!',
                        content: MjmlToJson(message.content) || BlockManager.getBlockByType(BasicType.PAGE)!.create({}),
                    });
                    break;
                default:
                    break;
            };
        };
        window.addEventListener('message', messageHandler);

        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'fetchFileContent' });

        return () => {
            window.removeEventListener('message', messageHandler);
        };
    }, []);

    if (!mjml) {
        return null;
    }

    return (
        <EmailEditorProvider
            data={mjml}
            height="100vh"
            autoComplete
            dashed={false}
        >
            {({ values }) => {
                return (
                    <StandardLayout
                        compact={!smallScene}
                        showSourceCode={true}
                        categories={defaultCategories}
                    >
                        <EmailEditor />
                    </StandardLayout>
                );
            }}
        </EmailEditorProvider>
    );
};

export default App;