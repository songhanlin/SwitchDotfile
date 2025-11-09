/**
 * 将开启的 dotfile 写入到系统文件
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { getDotfileContentOfList, setSystemDotfile } from '@main/actions'
import { IDotfileListObject } from '@common/data'
import { IHostsWriteOptions } from '@main/types'
import { flatten } from '@common/dotfileFn'

interface IWriteResult {
  success: boolean
  code?: string
  message?: string
  old_content?: string
  new_content?: string
}

const writeDotfilesToSystem = async (
  list?: IDotfileListObject[],
  options?: IHostsWriteOptions,
): Promise<{ success: boolean; results: Record<string, boolean>; errors: Record<string, IWriteResult> }> => {
  if (!Array.isArray(list)) {
    return { success: false, results: {}, errors: {} }
  }

  const content_map = await getDotfileContentOfList(list)
  const results: Record<string, boolean> = {}
  const errors: Record<string, IWriteResult> = {}

  // 找出所有被管理的文件路径（有 file_path 的 folder 或 system_file）
  // 即使没有启用的配置项，也需要更新这些文件（移除管理内容）
  const all_managed_files = new Set<string>()
  const flat_list = flatten(list)
  for (const item of flat_list) {
    if ((item.type === 'folder' || item.type === 'system_file') && item.file_path) {
      all_managed_files.add(item.file_path)
    }
  }

  // 确保所有被管理的文件都在 content_map 中（即使没有启用的配置项）
  for (const file_path of all_managed_files) {
    if (!(file_path in content_map)) {
      // 如果没有启用的配置项，传入空字符串，这样会移除管理内容
      content_map[file_path] = ''
    }
  }

  // 并行写入所有文件
  const writePromises = Object.entries(content_map).map(async ([file_path, content]) => {
    try {
      const result = await setSystemDotfile(file_path, content, options)
      results[file_path] = result.success
      if (!result.success) {
        errors[file_path] = result
      }
      return result.success
    } catch (e) {
      console.error(`Failed to write ${file_path}:`, e)
      results[file_path] = false
      errors[file_path] = {
        success: false,
        code: 'fail',
        message: e instanceof Error ? e.message : String(e),
      }
      return false
    }
  })

  const writeResults = await Promise.all(writePromises)
  const success = writeResults.every((r) => r)

  return { success, results, errors }
}

export default writeDotfilesToSystem

