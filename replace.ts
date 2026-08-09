import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'

async function* getFiles(dir: string): AsyncGenerator<string> {
  const dirents = await readdir(dir, { withFileTypes: true })
  for (const dirent of dirents) {
    const res = join(dir, dirent.name)
    if (dirent.isDirectory()) {
      yield* getFiles(res)
    } else {
      if (extname(res) === '.ts' || extname(res) === '.tsx') {
        yield res
      }
    }
  }
}

async function run() {
  let count = 0
  for await (const f of getFiles('packages/react')) {
    const content = await readFile(f, 'utf8')
    if (content.includes('#vue')) {
      const newContent = content.replace(/#vue/g, '#react')
      await writeFile(f, newContent, 'utf8')
      count++
    }
  }
  console.log(`Updated ${count} files.`)
}
run().catch(console.error)
