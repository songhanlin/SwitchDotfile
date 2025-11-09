/**
 * 获取列表中所有开启的 dotfile 的内容，按路径分组并合并
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { getDotfileContent, getItemFromList } from '@main/actions'
import { IDotfileListObject } from '@common/data'
import { flatten, getParentOfItem } from '@common/dotfileFn'
import * as path from 'path'

/**
 * 深度合并两个对象（用于 JSON 配置合并）
 */
const deepMerge = (target: any, source: any): any => {
  if (typeof target !== 'object' || target === null) {
    return source
  }
  if (typeof source !== 'object' || source === null) {
    return source
  }
  
  // 如果是数组，直接返回源数组（可以根据需求调整策略）
  if (Array.isArray(source)) {
    return source
  }
  
  const merged = { ...target }
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        // 递归合并嵌套对象
        merged[key] = deepMerge(target[key], source[key])
      } else {
        // 直接覆盖（后添加的配置项优先级更高）
        merged[key] = source[key]
      }
    }
  }
  
  return merged
}

/**
 * 检查文件路径是否是 JSON 文件
 */
const isJsonFile = (file_path: string): boolean => {
  const ext = path.extname(file_path).toLowerCase()
  return ext === '.json'
}

/**
 * 合并多个 JSON 内容
 */
const mergeJsonContents = (contents: string[]): string => {
  if (contents.length === 0) {
    return '{}'
  }
  
  if (contents.length === 1) {
    return contents[0]
  }
  
  let merged: any = {}
  
  for (const content of contents) {
    try {
      const parsed = JSON.parse(content.trim())
      merged = deepMerge(merged, parsed)
    } catch (e) {
      console.error('Failed to parse JSON content:', e)
      // 如果解析失败，跳过该内容
      continue
    }
  }
  
  // 格式化输出（2 空格缩进）
  return JSON.stringify(merged, null, 2)
}

const getContentOfList = async (list: IDotfileListObject[]): Promise<Record<string, string>> => {
  const content_map: Record<string, string[]> = {}
  
  // 获取所有开启的配置项（local 类型），但排除默认配置项（id 以 -default 结尾）
  // 默认配置项代表系统原始内容，应该从系统文件中读取，而不是从数据库
  const flat = flatten(list).filter((item) => item.on && item.type === 'local' && !item.id.endsWith('-default'))

  for (let item of flat) {
    // 获取父文件夹（应该包含 file_path）
    // 查找逻辑：
    // 1. 如果当前项有 file_path，直接使用（向后兼容）
    // 2. 否则，向上查找父文件夹，优先使用直接父文件夹的 file_path
    //    如果直接父文件夹有 file_path，使用它；否则继续向上查找
    let file_path: string | undefined
    
    // 如果当前项有 file_path，直接使用
    if (item.file_path) {
      file_path = item.file_path
    } else {
      // 向上查找父文件夹，找到第一个有 file_path 的父文件夹（system_file 或 folder 类型）
      let current_item: IDotfileListObject | null = item
      while (current_item) {
        const parent = getParentOfItem(list, current_item.id)
        if (parent && (parent.type === 'folder' || parent.type === 'system_file') && parent.file_path) {
          file_path = parent.file_path
          break
        }
        // 如果父文件夹没有 file_path，继续向上查找
        if (parent) {
          current_item = parent
        } else {
          break
        }
      }
    }
    
    if (file_path) {
      if (!content_map[file_path]) {
        content_map[file_path] = []
      }
      const content = await getDotfileContent(item.id)
      if (content) {
        content_map[file_path].push(content)
      }
    }
  }

  // 合并同一路径下的所有内容
  const result: Record<string, string> = {}
  for (const [file_path, contents] of Object.entries(content_map)) {
    if (isJsonFile(file_path)) {
      // JSON 文件：深度合并 JSON 对象
      result[file_path] = mergeJsonContents(contents)
    } else {
      // 非 JSON 文件：使用换行符连接
      result[file_path] = contents.join('\n\n')
    }
  }

  return result
}

export default getContentOfList

