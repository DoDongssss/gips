/**
 * Prints one piece of markup through an isolated hidden frame, so only that markup
 * (a receipt, an X or Z report) is sent to the printer. Use inline styles: the app's
 * stylesheet does not exist inside the frame. The page is 80 mm wide for thermal paper.
 */
export function printHtml(title: string, bodyHtml: string): void {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    const win = frame.contentWindow;

    if (!doc || !win) {
        frame.remove();

        return;
    }

    doc.open();
    doc.write(
        `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>` +
            `<style>@page{size:80mm auto;margin:4mm}body{margin:0;width:72mm}</style></head><body>${bodyHtml}</body></html>`,
    );
    doc.close();

    win.focus();
    win.print();

    // Give the print dialog time to read the frame before it goes away.
    window.setTimeout(() => frame.remove(), 2000);
}
