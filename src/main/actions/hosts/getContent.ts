/**
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { configGet, getItemFromList, getList } from '@main/actions'
import { swhdb } from '@main/data'
import { IDotfileContentObject } from '@common/data'
import { findItemById, flatten } from '@common/dotfileFn'

const getContentById = async (id: string) => {
  let dotfile_content = await swhdb.collection.dotfile.find<IDotfileContentObject>((i: any) => i.id === id)
  return dotfile_content?.content || ''
}

const getContentOfDotfile = async (id: string): Promise<string> => {
  let dotfile = await getItemFromList(id)
  if (!dotfile) {
    return await getContentById(id)
  }

  const { type } = dotfile
  if (!type || type === 'local' || type === 'remote') {
    return await getContentById(id)
  }

  let list = await getList()

  let multi_chose_folder_switch_all = await configGet('multi_chose_folder_switch_all')
  let isSkipFolder = multi_chose_folder_switch_all && dotfile.folder_mode !== 1

  if (type === 'folder' && !isSkipFolder) {
    const items = flatten(dotfile.children || [])

    let a = await Promise.all(
      items.map(async (item) => {
        return `# file: ${item.title}\n` + (await getContentOfDotfile(item.id))
      }),
    )
    return a.join('\n\n')
  }

  if (type === 'group') {
    let a = await Promise.all(
      (dotfile.include || []).map(async (id) => {
        let item = findItemById(list, id)
        if (!item) return ''

        return `# file: ${item.title}\n` + (await getContentOfDotfile(id))
      }),
    )
    return a.join('\n\n')
  }

  return ''
}

export default getContentOfDotfile
export { getContentOfDotfile }
