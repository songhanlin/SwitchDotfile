/**
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { swhdb } from '@main/data'
import { IDotfileBasicData, IDotfileListObject, ITrashcanListObject, VersionType } from '@common/data'
import { flatten, findItemById } from '@common/dotfileFn'
import { v4 as uuid4 } from 'uuid'
import version from '@/version.json'

const normalizeList = (list: IDotfileListObject[]): IDotfileListObject[] => {
  let flat = flatten(list)
  flat.map((item) => {
    if (!item.id) {
      item.id = uuid4()
    }
  })

  return list
}

const normalizeTrashcan = (list: ITrashcanListObject[]): ITrashcanListObject[] => {
  list.map((item) => {
    if (!item.id) {
      item.id = uuid4()
    }
  })

  return list
}

export default async (): Promise<IDotfileBasicData> => {
  const default_data: IDotfileBasicData = {
    list: [],
    trashcan: [],
    version: version as VersionType,
  }

  let list = normalizeList(await swhdb.list.tree.all())
  let trashcan = normalizeTrashcan(await swhdb.list.trashcan.all())
  let v = (await swhdb.dict.meta.get<VersionType>('version', version)) || [0, 0, 0, 0]

  return {
    ...default_data,
    list,
    trashcan,
    version: v,
  }
}
