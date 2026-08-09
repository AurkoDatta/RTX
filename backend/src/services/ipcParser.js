/**
 * Incremental parser for the renderer's newline-delimited JSON IPC protocol.
 * Child-process stdout arrives in arbitrary chunks that don't necessarily
 * align with line boundaries, so this buffers a partial trailing line across
 * calls to `push()` and only ever hands complete, whole lines to the caller.
 */
export class IpcLineParser {
  #buffer = '';

  /**
   * Feeds a chunk of raw stdout data (Buffer or string). Returns an array of
   * parsed message objects found in this chunk -- zero, one, or many,
   * depending on how many complete lines the chunk contained.
   *
   * A line that isn't valid JSON is skipped rather than thrown, since one
   * malformed or stray line (e.g. renderer debug output that leaked onto
   * stdout instead of stderr) shouldn't take down the whole render job --
   * it's logged instead so the problem stays visible.
   */
  push(chunk) {
    this.#buffer += chunk.toString('utf-8');
    const lines = this.#buffer.split('\n');
    // The last element is either '' (chunk ended exactly on a newline) or a
    // partial line to carry over and complete on the next call.
    this.#buffer = lines.pop();

    const messages = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') continue;
      try {
        messages.push(JSON.parse(trimmed));
      } catch {
        console.warn('ipcParser: skipping malformed IPC line:', trimmed.slice(0, 200));
      }
    }
    return messages;
  }
}
