/**
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { swhdb } from '@main/data'
import { IDotfileContentObject } from '@common/data'

export default async (id: string, content: string) => {
  let d = await swhdb.collection.dotfile.find<IDotfileContentObject>((i) => i.id === id)
  if (!d || !d._id) {
    await swhdb.collection.dotfile.insert({ id, content })
  } else {
    await swhdb.collection.dotfile.update((i) => i._id === d?._id, { content })
  }
}
