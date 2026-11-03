const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** ESC/POS only speaks basic characters: swap the peso sign, drop accents, replace the rest with "?". */
export function toAscii(text: string): string {
    return text
        .replace(/₱/g, 'PHP ')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^\x20-\x7e\n]/g, '?');
}

/** Builds the bytes a thermal receipt printer understands (ESC/POS, the de-facto standard). */
export class EscPos {
    private bytes: number[] = [];

    /** @param columns characters per line: 32 for 58 mm paper, 48 for 80 mm */
    constructor(readonly columns: number) {
        this.raw(ESC, 0x40); // reset
    }

    raw(...values: number[]): this {
        this.bytes.push(...values);

        return this;
    }

    text(value: string): this {
        for (const char of toAscii(value)) {
            this.bytes.push(char.charCodeAt(0));
        }

        return this;
    }

    line(value = ''): this {
        return this.text(value).raw(LF);
    }

    align(where: 'left' | 'center' | 'right'): this {
        return this.raw(ESC, 0x61, { left: 0, center: 1, right: 2 }[where]);
    }

    bold(on: boolean): this {
        return this.raw(ESC, 0x45, on ? 1 : 0);
    }

    /** Character size: 1 = normal, 2 = double. */
    size(width: 1 | 2, height: 1 | 2): this {
        return this.raw(GS, 0x21, ((width - 1) << 4) | (height - 1));
    }

    rule(char = '-'): this {
        return this.line(char.repeat(this.columns));
    }

    /** "Latte x2 ............ 240.00": left text and right text on one line. */
    pair(left: string, right: string): this {
        const space = Math.max(1, this.columns - toAscii(left).length - toAscii(right).length);

        return this.line(toAscii(left) + ' '.repeat(space) + toAscii(right));
    }

    feed(lines = 1): this {
        return this.raw(ESC, 0x64, lines);
    }

    /** Feed, then a partial cut. */
    cut(): this {
        return this.feed(3).raw(GS, 0x56, 0x42, 0);
    }

    /** Pulse the cash drawer connected to the printer. */
    drawer(): this {
        return this.raw(ESC, 0x70, 0, 25, 250);
    }

    toBytes(): Uint8Array {
        return Uint8Array.from(this.bytes);
    }
}

export const columnsFor = (paperWidthMm: number): number => (paperWidthMm === 58 ? 32 : 48);
