/**
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { swhdb } from '@main/data'
import { IDotfileListObject } from '@common/data'
import { flatten } from '@common/dotfileFn'

export default async (list: IDotfileListObject[]) => {
  // 确保所有有 file_path 的 folder 和 system_file 都有默认配置项
  // 同时确保这些文件夹始终展开且不能折叠
  const all_folders = flatten(list).filter((item) => (item.type === 'folder' || item.type === 'system_file') && item.file_path)
  
  for (const folder of all_folders) {
    // 确保 dotfile 文件夹始终展开
    folder.folder_open = true
    folder.is_collapsed = false
    if (!folder.children) {
      folder.children = []
    }
    
    const default_item_id = `${folder.id}-default`
    const has_default_item = folder.children.find((child) => child.id === default_item_id)
    
    if (!has_default_item) {
      // 如果默认配置项不存在，创建一个空的配置项（不读取系统文件）
      const default_item: IDotfileListObject = {
        id: default_item_id,
        title: 'System Default Config',
        type: 'local',
        on: true,
      }
      folder.children.unshift(default_item) // 添加到开头
    }
  }
  
  await swhdb.list.tree.set(list)
}
