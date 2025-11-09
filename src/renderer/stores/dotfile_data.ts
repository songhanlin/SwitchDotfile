/**
 * dotfile_data.ts
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { IDotfileBasicData, IDotfileListObject, VersionType } from '@common/data'
import { atom } from 'jotai'
import version from '@/version.json'

export const dotfile_data_atom = atom<IDotfileBasicData>({
  list: [],
  trashcan: [],
  version: version as VersionType,
})

export const current_dotfile_atom = atom<IDotfileListObject | null>(null)
