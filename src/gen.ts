import * as fs from 'fs'
import * as path from 'path'

type BasePropType = 'integer' | 'number' | 'string'
type ComplexType = 'array' | 'object'
type PropType = BasePropType | ComplexType

const typeMap = {
	integer: 'number',
	number: 'number',
	string: 'string',
}

const generateParamType = (item: {
	type: PropType,
	[key: string]: any
}): string | undefined => {
	if (typeMap.hasOwnProperty(item.type)) {
		return typeMap[item.type as BasePropType]
	}
	switch (item.type) {
		case 'array':
			if (item.items.type) {
				return `${item.items.type}[]`
			}
			if (item.items["$ref"]) {
				return `${item.items["$ref"].split('#/definitions/')[1]}[]`
			}
			return undefined
		case 'object':
			return `{
        ${Object.keys(item.properties).map((property) => {
				return `${property}: ${generateParamType(item.properties[property])}`
			})}
      }`
		default:
			if (item['$ref']) {
				return item['$ref'].split('#/definitions/')[1]
			}
			break;
	}
}

const generateTS = (options: {
	sourceFilePath: string
	targetFilePath: string
}) => {

	const { sourceFilePath, targetFilePath } = options

	const result = fs.readFileSync(sourceFilePath).toString()
	const json = JSON.parse(result)

	// 类型定义
	const definitionTypes = Object.keys(json.definitions).map((definition) => {
		const item = json.definitions[definition]
		return `export interface ${definition} { ${Object.keys(item.properties || []).map((property) => {
			const title = item.properties[property]?.title || item.properties[property]?.description
			const requiredMark = '@required'
			const isRequired = title?.includes(requiredMark)
			return `
  /**
   * ${(isRequired ? title.replace(/@required/g, '   * @required') : title) || 'no description'}
   */
  ${property}: ${generateParamType(item.properties[property])}`
		})}
}`
	}).join('\n\n')

	// 接口代码
	const routeRequests = Object.keys(json.paths).map((path) => {
		const item = json.paths[path]
		const method = Object.keys(item)[0]
		const params = method === 'post' ? item[method].parameters[0].schema['$ref'].split('#/definitions/')[1] : `{${item[method].parameters.map((parameter: any) => {
			const title = parameter.description
			const requiredMark = '@required'
			const isRequired = title?.includes(requiredMark)
			return `
    /**
     * ${(isRequired ? title.replace(/@required./g, '     * @required') : title) || '暂无字段描述'}
     */
    ${parameter.name.includes('.') ? `'${parameter.name}'` : parameter.name}: ${generateParamType(parameter)}`
		})}
  }`
		return `  /**
   * ${item[method].summary.split('\n@author')[0]}
   */
  export const ${method}_${path.split('/').slice(1).join('_').split('v1_')[1].replace(/-/g, '_')} = (params: ${params}): Promise<${item[method].responses[200].schema['$ref'].split('#/definitions/')[1]}> => {
    return request.${method}('${path.replace(/-/g, '_')}', params)
  }`
	}).join('\n\n')

	const requestImport = `import request from './request'
`

	fs.writeFileSync(targetFilePath, [requestImport, definitionTypes, routeRequests].join('\n'))

	console.log('file generated', targetFilePath)
}

export const gen = (rootDir: string) => {

	console.log('original root', rootDir)

	const baseDir = rootDir ? path.resolve(rootDir) : process.cwd()

	console.log('real root', baseDir)

	const excludePaths = [
		'.DS_Store',
		'tsconfig.json',
		'pnpm-lock.yaml',
		'gen.ts',
		'package.json'
	]

	const directories = fs.readdirSync(baseDir)

	directories.forEach((dir) => {
		if (excludePaths.includes(dir)) {
			return
		}
		const fullPath = path.join(baseDir, dir)
		const files = fs.readdirSync(fullPath)

		files.forEach((file) => {
			if (file.endsWith('.swagger.json')) {
				const fileName = file.split('.swagger.json')[0]

				generateTS({
					sourceFilePath: path.join(fullPath, file),
					targetFilePath: path.join(fullPath, `${fileName}.ts`)
				})
			}
		})
	})
}
