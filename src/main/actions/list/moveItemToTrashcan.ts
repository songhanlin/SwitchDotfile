/**
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { getList } from '@main/actions'
import { broadcast } from '@main/core/agent'
import { swhdb } from '@main/data'
import { IDotfileListObject, ITrashcanObject } from '@common/data'
import events from '@common/events'
import * as dotfileFn from '@common/dotfileFn'

export default async (id: string) => {
  // 防止删除系统 dotfile 文件夹（id === '0'）和系统默认配置项（id === '0-default'）
  if (id === '0' || id === '0-default') {
    console.error(`Cannot delete system dotfile folder or system default config item (id: #${id}).`)
    return
  }
  
  // 防止删除任何默认配置项（格式：${folder_id}-default）
  if (id.endsWith('-default')) {
    console.error(`Cannot delete default config item (id: #${id}).`)
    return
  }

  let list: IDotfileListObject[] = await getList()
  
  let node = dotfileFn.findItemById(list, id)
  if (!node) {
    console.error(`can't find node by id #${id}.`)
    return
  }
  
  // 防止删除 system_file 类型的 dotfile（只能通过移除管理来删除）
  if (node.type === 'system_file') {
    console.error(`Cannot delete system_file type dotfile (id: #${id}). Use removeDotfileManagement instead.`)
    return
  }

  if (node.on) {
    // current dotfile is in use, toggle it off
    broadcast(events.toggle_item, node.id, false)
  }

  let obj: ITrashcanObject = {
    data: {
      ...node,
      on: false,
    },
    add_time_ms: new Date().getTime(),
    parent_id: dotfileFn.getParentOfItem(list, id)?.id || null,
  }

  await swhdb.list.trashcan.push(obj)

  dotfileFn.deleteItemById(list, id)
  await swhdb.list.tree.set(list)
}
