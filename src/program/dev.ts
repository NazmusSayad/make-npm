import fs from 'fs'
import path from 'path'
import config from '../config'
import tsc from '../scripts/tsc'
import updateImports from '../updateImports'
import { cleanDir, moveFiles } from '../utils'
import pushNodeCode from '../scripts/pushNodeCode'

export default function (basePath: string, options: DevOptions) {
  options.module ??= 'cjs'

  const tempDir = path.join(basePath, config.tempBuildDir)
  cleanDir(tempDir)
  cleanDir(options.outDir)

  function makeOutFiles(filename: string, outModule: 'cjs' | 'mjs') {
    const fullPath = path.join(tempDir, filename)
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const updatedImports = updateImports(outModule, [fullPath])
      const [movedFile] = moveFiles(tempDir, options.outDir, updatedImports)
      if (outModule === 'mjs' && options.node) pushNodeCode(movedFile)
    }
  }

  fs.watch(tempDir, { recursive: true }, (event, filename) => {
    if (event !== 'change' || !filename) return
    if (!(filename.endsWith('.js') || filename.endsWith('.ts'))) return
    makeOutFiles(filename, options.module!)
  })

  tsc(
    basePath,
    [
      ...options.tsc.map((tsc) => `--${tsc}`),
      `--outDir ${tempDir}`,
      `--module ${options.module === 'cjs' ? 'commonjs' : 'esnext'}`,
      '--watch',
    ],
    true
  )
}

type DevOptions = {
  module?: 'cjs' | 'mjs'
  node?: boolean
  outDir: string
  tsc: string[]
}
