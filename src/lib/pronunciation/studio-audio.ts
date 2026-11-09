/** Encode actual mono PCM samples as a 16-bit WAV file. */
export function encodeMonoWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => {
    const value = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
  });
  return buffer;
}

/** Validate real uncompressed audio rather than trusting a MIME label. */
export function getAssessmentWavInfo(buffer: ArrayBuffer) {
  if (buffer.byteLength < 44) return null;
  const view = new DataView(buffer);
  const text = (offset: number, size: number) => String.fromCharCode(...new Uint8Array(buffer, offset, size));
  if (text(0, 4) !== 'RIFF' || text(8, 4) !== 'WAVE') return null;
  const end = view.getUint32(4, true) + 8;
  if (end > buffer.byteLength || end < 44) return null;
  let validFormat = false;
  let dataOffset = 0;
  let dataBytes = 0;
  for (let offset = 12; offset + 8 <= end; ) {
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + size > end) return null;
    const chunk = text(offset, 4);
    if (chunk === 'fmt ') {
      if (size < 16) return null;
      validFormat =
        view.getUint16(start, true) === 1 &&
        view.getUint16(start + 2, true) === 1 &&
        view.getUint32(start + 4, true) === 16000 &&
        view.getUint16(start + 12, true) === 2 &&
        view.getUint16(start + 14, true) === 16;
    } else if (chunk === 'data') {
      dataOffset = start;
      dataBytes = size;
    }
    offset = start + size + (size % 2);
  }
  if (!validFormat || !dataBytes || dataBytes % 2) return null;
  return { dataOffset, dataBytes, durationMs: dataBytes / 32, sampleRate: 16000, channels: 1 };
}

export async function toAssessmentWav(blob: Blob): Promise<Blob> {
  const bytes = await blob.arrayBuffer();
  if (getAssessmentWavInfo(bytes)) return new Blob([bytes], { type: 'audio/wav' });
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(bytes);
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * 16000)), 16000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return new Blob([encodeMonoWav(rendered.getChannelData(0), 16000)], { type: 'audio/wav' });
  } finally {
    await context.close();
  }
}
