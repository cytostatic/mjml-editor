import React, { useEffect, useRef, useState } from 'react';
import { BlockManager, BasicType, AdvancedType, JsonToMjml } from 'easy-email-core';
import { EmailEditor, EmailEditorProvider, IEmailTemplate } from 'easy-email-editor';
import { BlockAttributeConfigurationManager, ExtensionProps, MjmlToJson, StandardLayout } from 'easy-email-extensions';
import { useWindowSize } from 'react-use';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client';
import { Log } from './utils/Log';

import 'easy-email-editor/lib/style.css';
import 'easy-email-extensions/lib/style.css';
import '@arco-themes/react-easy-email-theme/css/arco.css';
import './app.css';
import { Events } from '../types/EventTypes';
import { EventData } from '@estruyf/vscode';

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
                type: AdvancedType.WRAPPER,
            },
            {
                type: AdvancedType.GROUP,
            },
            {
                type: AdvancedType.NAVBAR,
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

let renderTimeout: number;

const App: React.FC = () => {
    const [theme, setTheme] = useState<string>('dark'); // ['light', 'dark'
    const [mjml, setMjml] = useState<IEmailTemplate | null>(null);
    const formRef: React.MutableRefObject<IEmailTemplate | null> = useRef(null);
    const { width } = useWindowSize();

    const smallScene = width < 1400;

    useEffect(() => {
        Messenger.getVsCodeAPI();

        const listener = (message: MessageEvent<EventData<unknown>>) => {
            const event = message.data;
            if (event.command === Events.GetEditorContent) {
                if (!formRef.current) {
                    return;
                }

                const html = JsonToMjml({
                    data: formRef.current.content,
                    mode: 'production',
                    context: formRef.current.content,
                });

                messageHandler.send(Events.GetEditorContent, html);
            }
        };
        Messenger.listen<unknown>(listener);

        messageHandler.request<string>(Events.FetchFileContent).then((data) => {
            let content = BlockManager.getBlockByType(BasicType.PAGE)!.create({});
            if (data) {
                try {
                    content = MjmlToJson(data);

                } catch (error: any) {
                    Log.error('Failed to parse MJML file content.', error);
                }
            }

            setMjml({
                subject: '',
                subTitle: '',
                content: content,
            });
        });

        applyTheme(document.body.className);
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutationRecord) {
                applyTheme((mutationRecord.target as any).className);
            });
        });

        const target = document.body;
        observer.observe(target, { attributes: true, attributeFilter: ['class'] });

        return () => {
            Messenger.unlisten(listener);
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        document.body.setAttribute('arco-theme', theme);
    }, [theme]);

    const applyTheme = (newTheme: string) => {
        const classParts = newTheme.split(' ');
        if (classParts.length > 1) {
            for (let part of classParts) {
                if (part === 'vscode-light' || part === 'vscode-dark' || part === 'high-contrast') {
                    newTheme = part;
                    break;
                }
            }
        }

        let prefix = 'vscode-';
        if (newTheme.startsWith(prefix)) {
            newTheme = newTheme.substr(prefix.length);
        }

        if (newTheme === 'high-contrast') {
            newTheme = 'dark';
        }

        setTheme(newTheme);
    };

    const renderEditor = async () => {
        const container = document.getElementById('easy-email-editor');
        if (!container) {
            return;
        }

        const nodes = Array.from(container.querySelectorAll('*'));
        const shadowRoots = nodes.map(el => el.shadowRoot).filter(Boolean);

        let images: HTMLImageElement[] = [];
        if (shadowRoots && shadowRoots.length) {
            for (let shadowRoot of shadowRoots) {
                if (!shadowRoot) {
                    continue;
                }

                images = [
                    ...images,
                    ...Array.from(shadowRoot.querySelectorAll('img')),
                ];
            }
        }

        const iframe = container.querySelectorAll('iframe');
        if (iframe && iframe.length && iframe[0]) {
            images = [
                ...images,
                ...Array.from(iframe[0].contentDocument!.querySelectorAll('img') || []),
            ];
        }

        if (!images.length) {
            return;
        }

        for (let image of images) {
            let src = image.getAttribute('src');
            let dataSrc = image.getAttribute('data-src');
            if (dataSrc && src?.startsWith('data:')) {
                src = dataSrc;
            }
            if (!src) {
                image.removeAttribute('data-src');
                continue;
            }
            image.setAttribute('data-src', src);

            if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('https://easy-email-m-ryan.vercel.app')) {
                continue;
            }

            if (src.startsWith('cid:')) {
                src = src.replace('cid:', '');
            }

            try {
                const dataUrl = await messageHandler.request<string>(Events.FetchImage, src);
                image.setAttribute('src', dataUrl);

            } catch (error) {}
        }
    };

    const debouncedRenderEditor = () => {
        // Hack to display local images
        window.clearTimeout(renderTimeout);
        renderTimeout = window.setTimeout(() => {
            renderEditor();
        }, 300);
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
                debouncedRenderEditor();

                return (
                    <StandardLayout
                        compact={!smallScene}
                        categories={defaultCategories}
                        showSourceCode={true}
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