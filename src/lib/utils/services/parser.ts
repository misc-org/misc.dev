type Content = TextFormat[];

type RawText = { type: 'text', text: string };

export type TextFormat =
    | RawText
    | { type: 'u' | 's' | 'em' | 'strong' | 'a' | 'code', content: RawText } & Partial<{ href: string }>
    | { type: 'br' }
    | { type: 'span', content: SpanElement };

export type MainElement =
    | { type: 'p', content: Content }
    | { type: 'h2' | 'h3' | 'h4', content: Content }
    | { type: 'blockquote', content: MainElement[] }
    | { type: 'table', content: TableElement }
    | { type: 'ul' | 'ol', content: ListElement[] }
    | { type: 'div', content: DivElement }
    | { type: 'figure', content: FigureElement }
    | { type: 'pre', content: CodeFormat[] };

type TableElement = { tbody: TableRowElement[] };

type TableRowElement = { type: 'tr', content: TableCellElement[] };

type TableCellElement = { type: 'th' | 'td', content: MainElement[] };

type ListElement = { li: Content | MainElement };

type DivElement = { 'data-filename': string, pre: { code: string } };

type FigureElement = {
    a?: string,
    img: string
    alt: string,
    width: string,
    height: string,
    target: string,
    rel: string
};

type CodeFormat = { type: 'code', language: string, code: string, filename?: string };

type SpanElement =
    | { type: 'icon', content: string, size?: number }
    | { type: 'answer', content: string };

function processSpan(node: Element): SpanElement {
    const className = node.getAttribute('class') || '';
    const content = node.textContent || '';

    if (className === 'icon') {
        return { type: 'icon', content };
    } else if (className === 'answer') {
        return { type: 'answer', content };
    }

    return { type: 'icon', content };
}

function processText(node: Element): Content {
    const content: Content = [];

    Array.from(node.childNodes).forEach((childNode) => {
        if (childNode.nodeType === Node.TEXT_NODE) {
            content.push({ type: "text", text: childNode.textContent || '' });
        } else if (childNode instanceof Element) {
            const tagName = childNode.tagName.toLowerCase();
            if (tagName === 'u' || tagName === 's' || tagName === 'em' || tagName === 'strong' || tagName === 'br') {
                content.push({ type: tagName, content: { type: 'text', text: childNode.textContent as string } });
            } else if (tagName === 'a') {
                content.push({ type: 'a', content: { type: 'text', text: childNode.textContent as string }, href: childNode.getAttribute('href') || '' });
            } else if (tagName === 'span') {
                content.push({ type: 'span', content: processSpan(childNode) });
            } else if (tagName === 'code') {
                content.push({ type: 'code', content: { type: 'text', text: childNode.textContent as string } });
            }
        }
    });

    return content;
}

function processList(node: Element): ListElement[] {
    const listItems: ListElement[] = [];

    Array.from(node.childNodes).forEach((childNode) => {
        if (childNode instanceof Element) {
            if (childNode.tagName === 'LI') {
                listItems.push({ li: processText(childNode) });
            }
        }
    });

    return listItems;
}

function processDiv(node: Element): DivElement {
    const filename = node.getAttribute("data-filename") || "";
    const codeElement = node.querySelector("code");
    const code = codeElement ? codeElement.textContent || "" : "";

    return { 'data-filename': filename, pre: { code } };
}

function processFigure(node: Element): FigureElement {
    const aElement = node.querySelector('a');
    let imgElement = node.querySelector('img');

    if (aElement) {
        imgElement = aElement.querySelector('img');
    }

    const img = imgElement ? imgElement.getAttribute('src') || '' : '';
    const alt = imgElement ? imgElement.getAttribute('alt') || '' : '';
    const width = imgElement ? imgElement.getAttribute('width') || '' : '';
    const height = imgElement ? imgElement.getAttribute('height') || '' : '';

    const a = aElement ? aElement.getAttribute('href') || '' : '';
    const target = aElement ? aElement.getAttribute('target') || '' : '';
    const rel = aElement ? aElement.getAttribute('rel') || '' : '';

    return { img, alt, width, height, a, target, rel };
}

function processThd(node: Element): MainElement[] {
    const content: MainElement[] = [];

    Array.from(node.childNodes).forEach((childNode) => {
        if (childNode.nodeType === Node.TEXT_NODE) {
        } else if (childNode instanceof Element) {
            if (childNode.tagName === 'P') {
                content.push({ type: 'p', content: processText(childNode) });
            } else if (childNode.tagName === 'FIGURE') {
                content.push({ type: 'figure', content: processFigure(childNode) });
            }
        }
    });

    return content;
}

function processTable(node: Element): TableElement {
    const tbody: TableRowElement[] = [];

    Array.from(node.querySelectorAll('tr')).forEach((row) => {
        const tr: TableCellElement[] = [];
        Array.from(row.childNodes).forEach((cell) => {
            if (cell instanceof Element) {
                if (cell.tagName === 'TH') {
                    tr.push({ type: 'th', content: processThd(cell) });
                } else if (cell.tagName === 'TD') {
                    tr.push({ type: 'td', content: processThd(cell) });
                }
            }
        });
        tbody.push({ type: 'tr', content: tr });
    });

    return { tbody };
}

function processCode(node: Element): CodeFormat[] {
    const code = node.textContent || '';
    const language = node.getAttribute('data-language') || '';

    return [{ type: 'code', language, code }];
}

function processQuote(node: Element): MainElement[] {
    const content: MainElement[] = [];

    Array.from(node.childNodes).forEach((childNode) => {
        if (childNode instanceof Element) {
            if (childNode.tagName === 'P') {
                content.push({ type: 'p', content: processText(childNode) });
            }
        }
    });

    return content;
}

export function parser(data: any, content: any[]) {
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(data, "text/html");

    Array.from(doc.body.childNodes).forEach((node) => {
        if (node instanceof Element) {
            if (node.tagName === 'H2' || node.tagName === 'H3' || node.tagName === 'H4') {
                content.push({ type: node.tagName.toLowerCase(), content: processText(node) });
            } else if (node.tagName === 'TABLE') {
                content.push({ type: 'table', content: processTable(node) });
            } else if (node.tagName === 'UL' || node.tagName === 'OL') {
                content.push({ type: node.tagName.toLowerCase(), content: processList(node) });
            } else if (node.tagName === 'DIV') {
                content.push({ type: 'div', content: processDiv(node) });
            } else if (node.tagName === 'FIGURE') {
                content.push({ type: 'figure', content: processFigure(node) });
            } else if (node.tagName === 'PRE') {
                content.push({ type: 'pre', content: processCode(node) });
            } else if (node.tagName === 'BLOCKQUOTE') {
                content.push({ type: 'blockquote', content: processQuote(node) });
            } else if (node.tagName === 'P') {
                content.push({ type: 'p', content: processText(node) });
            } else {
                content.push({ type: "html", html: node.outerHTML });
            }
        }
    });

    return content;
}