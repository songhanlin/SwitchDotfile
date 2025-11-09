/**
 * useDotfileData
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { actions } from '@renderer/core/agent'
import { IDotfileBasicData, IDotfileListObject, VersionType } from '@common/data'
import { flatten } from '@common/dotfileFn'
import version from '@/version.json'
import { useState } from 'react'
import { useAtom } from 'jotai'
import { current_dotfile_atom, dotfile_data_atom } from '@renderer/stores/dotfile_data'

export default function useDotfileData() {
  const [dotfile_data, setDotfileData] = useAtom(dotfile_data_atom)
  const [current_dotfile, setCurrentDotfile] = useAtom(current_dotfile_atom)
  
  const loadDotfileData = async () => {
    setDotfileData(await actions.getBasicData())
  }

  const setList = async (list: IDotfileListObject[]) => {
    // 保存完整的列表
    let data: IDotfileBasicData = {
      list,
      trashcan: dotfile_data?.trashcan || [],
      version: version as VersionType,
    }

    setDotfileData(data)
    await actions.setList(list)
    await actions.updateTrayTitle()
  }
  
  const isDotfileInTrashcan = (id: string): boolean => {
    return (dotfile_data?.trashcan || []).findIndex((i: any) => i.data.id === id) > -1
  }

  const isReadOnly = (dotfile?: IDotfileListObject | null): boolean => {
    const target_dotfile = dotfile || current_dotfile

    if (!target_dotfile) {
      return true
    }

    // 检查是否是默认配置项
    const is_default_item = target_dotfile.id.endsWith('-default') || target_dotfile.id === '0-default'

    // 系统 dotfile 文件夹（id === '0'）本身不可编辑内容（只能编辑信息）
    if (target_dotfile.id === '0' && target_dotfile.type === 'folder') {
      return true
    }

    // 默认配置项不可编辑（和文件夹一样，只读）
    // 默认配置项实际上代表的是父文件夹的合并内容，所以应该和文件夹有相同的权限
    if (is_default_item) {
      return true
    }

    // 文件夹类型和系统文件类型不可编辑内容（只能编辑信息）
    if (target_dotfile.type === 'folder' || target_dotfile.type === 'system_file') {
      return true
    }

    if (target_dotfile.type && ['group', 'remote', 'trashcan'].includes(target_dotfile.type)) {
      return true
    }

    if (isDotfileInTrashcan(target_dotfile.id)) {
      return true
    }

    // ..
    return false
  }

  return {
    dotfile_data,
    setDotfileData,
    loadDotfileData,
    setList,
    current_dotfile,
    setCurrentDotfile,
    isDotfileInTrashcan,
    isReadOnly,
  }
}
