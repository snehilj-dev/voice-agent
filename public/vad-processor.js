/**
 * AudioWorklet Processor for VAD (Voice Activity Detection)
 * Replaces deprecated ScriptProcessorNode
 */
class VADProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 512;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];

        // If no input, return true to keep processor alive
        if (!input || !input[0]) {
            return true;
        }

        const inputChannel = input[0];

        // Accumulate samples into buffer
        for (let i = 0; i < inputChannel.length; i++) {
            this.buffer[this.bufferIndex++] = inputChannel[i];

            // When buffer is full, send to main thread
            if (this.bufferIndex >= this.bufferSize) {
                // Copy buffer to avoid reference issues
                const audioData = new Float32Array(this.buffer);

                // Send to main thread for VAD processing
                this.port.postMessage({
                    type: 'audioData',
                    data: audioData
                });

                // Reset buffer
                this.bufferIndex = 0;
            }
        }

        // Return true to keep processor alive
        return true;
    }
}

registerProcessor('vad-processor', VADProcessor);
