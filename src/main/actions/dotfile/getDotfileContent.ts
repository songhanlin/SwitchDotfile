/**
 * 获取 dotfile 的内容
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { swhdb } from '@main/data'
import { IDotfileContentObject } from '@common/data'

const getContentById = async (id: string) => {
  let dotfile_content = await swhdb.collection.dotfile.find<IDotfileContentObject>((i) => i.id === id)
  return dotfile_content?.content || ''
}

const getDotfileContent = async (id: string): Promise<string> => {
  // 先从数据库获取内容
  return await getContentById(id)
}

export default getDotfileContent

