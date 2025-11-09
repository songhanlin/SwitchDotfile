/**
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { getList } from '@main/actions'
import { IDotfileListObject } from '@common/data'
import { findItemById } from '@common/dotfileFn'

export default async (id: string): Promise<IDotfileListObject | undefined> => {
  let list = await getList()
  return findItemById(list, id)
}
