/**
 * getHistoryList
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { swhdb } from '@main/data'
import { IDotfileHistoryObject } from '@common/data'

export default async (): Promise<IDotfileHistoryObject[]> => {
  let list = await swhdb.collection.history.all<IDotfileHistoryObject>()

  list = list.map((item) => {
    item.content = item.content || ''
    return item
  })

  return list
}
