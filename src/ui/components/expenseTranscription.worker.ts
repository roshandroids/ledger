import { env, pipeline } from '@huggingface/transformers'

if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1

let transcriber: ReturnType<typeof loadModel> | undefined

function loadModel() {
  return pipeline(
    'automatic-speech-recognition',
    'onnx-community/whisper-tiny.en',
    {
      device: 'wasm',
      dtype: 'q8',
    },
  )
}

self.onmessage = async ({ data }: MessageEvent<Float32Array>) => {
  try {
    transcriber ??= loadModel()
    const result = await (await transcriber)(data)
    const transcript = Array.isArray(result) ? result[0]?.text : result.text
    self.postMessage({ transcript: transcript?.trim() ?? '' })
  } catch {
    transcriber = undefined
    self.postMessage({ error: true })
  }
}
