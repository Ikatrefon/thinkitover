declare module 'mammoth/mammoth.browser' {
  interface ExtractRawTextOptions {
    arrayBuffer: ArrayBuffer
  }
  interface Result {
    value: string
    messages: unknown[]
  }
  const mammoth: {
    extractRawText(options: ExtractRawTextOptions): Promise<Result>
  }
  export = mammoth
}
