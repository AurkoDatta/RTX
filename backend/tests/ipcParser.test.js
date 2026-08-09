import { describe, expect, it, vi } from 'vitest';
import { IpcLineParser } from '../src/services/ipcParser.js';

describe('IpcLineParser', () => {
  it('parses a single complete line delivered in one chunk', () => {
    const parser = new IpcLineParser();
    const messages = parser.push('{"type":"progress","samples":1}\n');
    expect(messages).toEqual([{ type: 'progress', samples: 1 }]);
  });

  it('parses multiple complete lines delivered in one chunk', () => {
    const parser = new IpcLineParser();
    const messages = parser.push(
      '{"type":"progress","samples":1}\n{"type":"progress","samples":2}\n'
    );
    expect(messages).toHaveLength(2);
    expect(messages[0].samples).toBe(1);
    expect(messages[1].samples).toBe(2);
  });

  it('buffers a partial line split across two chunks', () => {
    const parser = new IpcLineParser();
    const firstHalf = '{"type":"progress","sam';
    const secondHalf = 'ples":42}\n';

    const fromFirstChunk = parser.push(firstHalf);
    expect(fromFirstChunk).toEqual([]);

    const fromSecondChunk = parser.push(secondHalf);
    expect(fromSecondChunk).toEqual([{ type: 'progress', samples: 42 }]);
  });

  it('buffers a partial line split across more than two chunks', () => {
    const parser = new IpcLineParser();
    expect(parser.push('{"type":')).toEqual([]);
    expect(parser.push('"complete",')).toEqual([]);
    expect(parser.push('"samples":10}\n')).toEqual([{ type: 'complete', samples: 10 }]);
  });

  it('accepts Buffer chunks, not just strings', () => {
    const parser = new IpcLineParser();
    const messages = parser.push(Buffer.from('{"type":"progress","samples":5}\n', 'utf-8'));
    expect(messages).toEqual([{ type: 'progress', samples: 5 }]);
  });

  it('skips a malformed line without throwing, and keeps parsing after it', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const parser = new IpcLineParser();

    const messages = parser.push(
      'not valid json\n{"type":"progress","samples":7}\n'
    );

    expect(messages).toEqual([{ type: 'progress', samples: 7 }]);
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it('ignores blank lines', () => {
    const parser = new IpcLineParser();
    const messages = parser.push('\n\n{"type":"progress","samples":1}\n\n');
    expect(messages).toEqual([{ type: 'progress', samples: 1 }]);
  });

  it('retains an incomplete final line across many small chunks', () => {
    const parser = new IpcLineParser();
    const full = '{"type":"frame","samples":3,"pixels_b64":"AAAA"}\n';
    let collected = [];
    for (const char of full) {
      collected = collected.concat(parser.push(char));
    }
    expect(collected).toEqual([{ type: 'frame', samples: 3, pixels_b64: 'AAAA' }]);
  });
});
