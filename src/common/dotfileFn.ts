/**
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { FolderModeType, IDotfileBasicData, IDotfileListObject, IDotfileBasicData, IDotfileListObject } from '@common/data'
import lodash from 'lodash'

type PartDotfileObjectType = Partial<IDotfileListObject> & { id: string }
// 兼容性别名
type PartHostsObjectType = PartDotfileObjectType

type Predicate = (obj: IDotfileListObject) => boolean

// 导出兼容性别名函数，内部使用新的类型
export const flatten = (list: IDotfileListObject[] | IDotfileListObject[]): IDotfileListObject[] => {
  let new_list: IDotfileListObject[] = []

  list.map((item: any) => {
    new_list.push(item)
    if (item.children) {
      new_list = [...new_list, ...flatten(item.children)]
    }
  })

  return new_list
}

// 兼容性别名
export const cleanHostsList = (data: IDotfileBasicData): IDotfileBasicData => {
  return cleanDotfileList(data as any) as any
}

export const cleanDotfileList = (data: IDotfileBasicData): IDotfileBasicData => {
  let list = flatten(data.list)

  list.map((item) => {
    if (item.type === 'folder' && !Array.isArray(item.children)) {
      item.children = [] as IDotfileListObject[]
    }

    if (item.type === 'group' && !Array.isArray(item.include)) {
      item.include = [] as string[]
    }

    if (item.type === 'folder' || item.type === 'group') {
      item.content = ''
    }
  })

  return data
}

// 兼容性：支持两种类型
export const findItemById = (
  list: IDotfileListObject[] | IDotfileListObject[],
  id: string,
): IDotfileListObject | IDotfileListObject | undefined => {
  return flatten(list as any).find((item) => item.id === id) as any
}

export const updateOneItem = (
  list: IDotfileListObject[] | IDotfileListObject[],
  item: PartDotfileObjectType | PartHostsObjectType,
): IDotfileListObject[] | IDotfileListObject[] => {
  let new_list: any = lodash.cloneDeep(list)

  let i = findItemById(new_list, item.id)
  if (i) {
    Object.assign(i, item)
  }

  return new_list
}

const isInTopLevel = (list: IDotfileListObject[] | IDotfileListObject[], id: string): boolean => {
  return list.findIndex((i: any) => i.id === id) > -1
}

export const setOnStateOfItem = (
  list: IDotfileListObject[] | IDotfileListObject[],
  id: string,
  on: boolean,
  default_choice_mode: FolderModeType = 0,
  multi_chose_folder_switch_all: boolean = false,
): IDotfileListObject[] | IDotfileListObject[] => {
  let new_list: any = lodash.cloneDeep(list)

  let item = findItemById(new_list, id)
  if (!item) return new_list

  item.on = on

  let itemIsInTopLevel = isInTopLevel(list, id)
  if (multi_chose_folder_switch_all) {
    item = switchFolderChild(item, on)
    !itemIsInTopLevel && switchItemParentIsON(new_list, item, on)
  }

  if (!on) {
    return new_list
  }

  if (itemIsInTopLevel) {
    if (default_choice_mode === 1) {
      new_list.map((item: any) => {
        if (item.id !== id) {
          item.on = false
          if (multi_chose_folder_switch_all) {
            item = switchFolderChild(item, false)
          }
        }
      })
    }
  } else {
    let parent = getParentOfItem(new_list, id)
    if (parent) {
      let folder_mode = parent.folder_mode || default_choice_mode
      if (folder_mode === 1 && parent.children) {
        // 单选模式
        parent.children.map((item: any) => {
          if (item.id !== id) {
            item.on = false
            if (multi_chose_folder_switch_all) {
              item = switchFolderChild(item, false)
            }
          }
        })
      }
    }
  }

  return new_list
}

export const switchItemParentIsON = (
  list: IDotfileListObject[] | IDotfileListObject[],
  item: IDotfileListObject | IDotfileListObject,
  on: boolean,
) => {
  let parent = getParentOfItem(list, item.id) as any

  if (parent) {
    if (parent.folder_mode === 1) {
      return
    }
    if (!on) {
      parent.on = on
    } else if (parent.children) {
      let parentOn = true
      parent.children.forEach((item: any) => {
        if (!item.on) {
          parentOn = false
        }
      })
      parent.on = parentOn
    }

    let itemIsInTopLevel = isInTopLevel(list, parent.id)
    if (!itemIsInTopLevel) {
      switchItemParentIsON(list, parent, on)
    }
  }
}

export const switchFolderChild = (item: IDotfileListObject | IDotfileListObject, on: boolean): IDotfileListObject | IDotfileListObject => {
  if (item.type != 'folder') {
    return item
  }
  let folder_mode = item.folder_mode
  if (folder_mode === 1) {
    return item
  }

  if (item.children) {
    item.children.forEach((child: any) => {
      child.on = on
      if (child.type == 'folder') {
        child = switchFolderChild(child, on)
      }
    })
  }

  return item
}

export const deleteItemById = (list: IDotfileListObject[] | IDotfileListObject[], id: string) => {
  let idx = list.findIndex((item: any) => item.id === id)
  if (idx >= 0) {
    list.splice(idx, 1)
    return
  }

  list.map((item: any) => deleteItemById(item.children || [], id))
}

export const getNextSelectedItem = (
  tree: IDotfileListObject[] | IDotfileListObject[],
  predicate: Predicate,
): IDotfileListObject | IDotfileListObject | undefined => {
  let flat = flatten(tree as any)
  let idx_1 = -1
  let idx_2 = -1

  flat.map((i: any, idx) => {
    if (predicate(i)) {
      if (idx_1 === -1) {
        idx_1 = idx
      }
      idx_2 = idx
    }
  })

  return flat[idx_2 + 1] || flat[idx_1 - 1] as any
}

export const getParentOfItem = (
  list: IDotfileListObject[] | IDotfileListObject[],
  item_id: string,
): IDotfileListObject | IDotfileListObject | undefined => {
  if (list.find((i: any) => i.id === item_id)) {
    // is in the top level
    return
  }

  let flat = flatten(list as any)
  for (let p of flat) {
    if (p.children && p.children.find((i: any) => i.id === item_id)) {
      return p as any
    }
  }
}
