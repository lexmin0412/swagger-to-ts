# @lexmin0412/swagger2ts

A tool for transfer swagger to ts, available both for API and CLI.

## Install

```shell
# install in current project, better for API usage
npm install @lexmin0412/swagger2ts
# install global, better for CLI usage
npm install @lexmin0412/swagger2ts -g
```

## Usage

### API Usage

```ts
import path from 'path'
import { gen } from '@lexmin0412/swagger2ts'

const rootDir = path.resolve(__dirname)
const requestInstancePath = path.resolve(__dirname, 'src', 'request.ts')

gen({
	rootDir,
  requestInstancePath,
  excludeDirs: [
		'node_modules',
		'test',
		'docs',
  ]
})
```

### CLI Usage

```shell
npx s2c ./
```

## Options

```typescript
interface GenOptions {
	/**
	 * root dir for excuting tasks to generate files
	 */
	rootDir: string
	/**
	 * path for your custom request instance
	 */
	requestInstancePath: string
	/**
	 * excluded paths when scanning *.swagger.json files
	 */
	excludeDirs: string[]
}
```
