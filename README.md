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
gen(rootDir)
```

### CLI Usage

```shell
npx s2c ./
```
