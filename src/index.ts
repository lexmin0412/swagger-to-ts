import * as fs from 'fs'
import * as path from 'path'
import { toCamelCase } from '@lexmin0412/naming'

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
				return `${[generateParamType(item.items)]}[]`
			}
			if (item.items["$ref"]) {
				return toCamelCase(`${item.items["$ref"].split('#/definitions/')[1].replace(/\./g, '__') }[]`)
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
				return toCamelCase(item['$ref'].split('#/definitions/')[1].replace(/\./g, '__'))
			}
			break;
	}
}

const generateTS = (options: {
	sourceFilePath: string
	targetFilePath: string
	requestImportStatement: string
}) => {

	const { sourceFilePath, targetFilePath, requestImportStatement } = options

	const result = fs.readFileSync(sourceFilePath).toString()
	const json = JSON.parse(result)

	// 类型定义
	const definitionTypes = Object.keys(json.definitions).map((definition) => {
		const item = json.definitions[definition]
		const interfaceName = toCamelCase(definition.replace(/\./g, '__'))
		return `export interface ${interfaceName} { ${Object.keys(item.properties || []).map((property) => {
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
		const params = method === 'post' ? toCamelCase(item[method].parameters[0].schema['$ref'].split('#/definitions/')[1].replace(/\./g, '__')) : `{${item[method].parameters.map((parameter: any) => {
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

		const requestName = toCamelCase(`${method}_${path.split('/').slice(1).join('_').split('v1_')[1].replace(/-/g, '_')}`)

		return `/**
 * ${item[method].summary.split('\n@author')[0]}
 */
export const ${requestName} = (params: ${params}): Promise<{body: ${toCamelCase(item[method].responses[200].schema['$ref'].split('#/definitions/')[1].replace(/\./g, '__'))}}> => {
  return customFetch({
		url: '${path}',
		method: '${method}',
		${method === 'post' ? 'body: params,' : 'query: params,'}
	})
}`
}).join('\n\n')

	fs.writeFileSync(targetFilePath, [requestImportStatement, definitionTypes, routeRequests].join('\n'))

	console.log('file generated, full path:', targetFilePath)
}

interface GenOptions {
	/**
	 * 执行生成任务的根目录
	 */
	rootDir: string
	/**
	 * request请求类文件路径
	 */
	requestInstancePath: string
	/**
	 * 忽略的目录
	 */
	excludeDirs?: string[]
}

export const gen = (options: GenOptions) => {

	const { rootDir, requestInstancePath, excludeDirs = [] } = options

	console.log('original root', rootDir)

	const baseDir = rootDir ? path.resolve(rootDir) : process.cwd()

	console.log('real root', baseDir)

	const excludePaths = [
		'node_modules',
		'.DS_Store',
		'.vscode',
		'.idea',
		...excludeDirs
	]

	const directories = fs.readdirSync(baseDir)

	const requestImportStatement = `import customFetch from '${requestInstancePath}'
`

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
					targetFilePath: path.join(fullPath, `${fileName}.ts`),
					requestImportStatement
				})
			}
		})
	})
}