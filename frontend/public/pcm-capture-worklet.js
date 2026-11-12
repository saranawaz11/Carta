class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 24000;
    this.frameSamples = 2400;
    this.phase = 0;
    this.filtered = 0;
    this.frame = new Int16Array(this.frameSamples);
    this.frameOffset = 0;
    this.port.onmessage = (event) => {
      if (event.data === "flush") this.flush();
    };
  }

  flush() {
    if (this.frameOffset) {
      const partial = this.frame.slice(0, this.frameOffset);
      this.port.postMessage(partial.buffer, [partial.buffer]);
      this.frameOffset = 0;
    }
    this.port.postMessage({ type: "flushed" });
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (output) output.fill(0);
    if (!input) return true;
    const alpha = Math.min(1, this.targetRate / sampleRate);
    for (let i = 0; i < input.length; i += 1) {
      this.filtered += alpha * (input[i] - this.filtered);
      this.phase += this.targetRate;
      if (this.phase < sampleRate) continue;
      this.phase -= sampleRate;
      const sample = Math.max(-1, Math.min(1, this.filtered));
      this.frame[this.frameOffset] =
        sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767);
      this.frameOffset += 1;
      if (this.frameOffset === this.frameSamples) {
        const complete = this.frame;
        this.port.postMessage(complete.buffer, [complete.buffer]);
        this.frame = new Int16Array(this.frameSamples);
        this.frameOffset = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-capture", PcmCaptureProcessor);
