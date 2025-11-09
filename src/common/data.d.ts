import { ITreeNodeData } from './tree'

export type DotfileType = 'local' | 'remote' | 'group' | 'folder' | 'system_file'
export type FolderModeType = 0 | 1 | 2 // 0: 默认; 1: 单选; 2: 多选

export interface IDotfileListObject {
  id: string
  title?: string
  on?: boolean
  type?: DotfileType
  file_path?: string // dotfile 文件路径，如 ~/.zshrc, ~/.gitconfig

  // remote
  url?: string
  last_refresh?: string
  last_refresh_ms?: number
  refresh_interval?: number // 单位：秒

  // group
  include?: string[]

  // folder
  folder_mode?: FolderModeType
  folder_open?: boolean
  children?: IDotfileListObject[]

  [key: string]: any
}

export interface IDotfileContentObject {
  id: string
  content: string

  [key: string]: any
}

export interface ITrashcanObject {
  data: IDotfileListObject
  add_time_ms: number
  parent_id: string | null
}

export interface ITrashcanListObject extends ITrashcanObject, ITreeNodeData {
  id: string
  children?: ITrashcanListObject[]
  is_root?: boolean
  type?: DotfileType | 'trashcan'

  [key: string]: any
}

export interface IDotfileHistoryObject {
  id: string
  content: string
  add_time_ms: number
  label?: string
}

export type VersionType = [number, number, number, number]

export interface IDotfileBasicData {
  list: IDotfileListObject[]
  trashcan: ITrashcanObject[]
  version: VersionType
}


export interface IOperationResult {
  success: boolean
  message?: string
  data?: any
  code?: string | number
}

export interface ICommandRunResult {
  _id?: string
  success: boolean
  stdout: string
  stderr: string
  add_time_ms: number
}
