/**
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { configGet, getDotfileContent, getDotfileContentOfList, writeDotfilesToSystem } from '@main/actions'
import { IDotfileListObject } from '@common/data'
import { flatten } from '@common/dotfileFn'
import normalize, { INormalizeOptions } from '@common/normalize'

const getContentOfList = async (list: IDotfileListObject[]): Promise<string> => {
  // 检查是否是 dotfile 模式（通过检查是否有 file_path 字段）
  const hasDotfiles = list.some((item) => {
    const flat = flatten([item])
    return flat.some((i) => i.file_path)
  })

  if (hasDotfiles) {
    // Dotfile 模式：返回文件路径和内容的映射（序列化为字符串用于显示）
    const content_map = await getDotfileContentOfList(list)
    return JSON.stringify(content_map, null, 2)
  }

  // 原有的 dotfile 模式
  const content_list: string[] = []
  const flat = flatten(list).filter((item) => item.on)

  for (let dotfile of flat) {
    let c = await getDotfileContent(dotfile.id)
    content_list.push(c)
  }

  let content = content_list.join('\n\n')
  // console.log(content)
  let options: INormalizeOptions = {}

  if (await configGet('remove_duplicate_records')) {
    options.remove_duplicate_records = true
  }

  content = normalize(content, options)

  return content
}

export default getContentOfList
