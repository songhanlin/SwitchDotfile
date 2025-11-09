/**
 * List
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { Center, useToast } from '@chakra-ui/react'
import { IHostsWriteOptions } from '@main/types'
import ItemIcon from '@renderer/components/ItemIcon'
import { Tree } from '@renderer/components/Tree'
import { actions, agent } from '@renderer/core/agent'
import useOnBroadcast from '@renderer/core/useOnBroadcast'
import { IDotfileListObject } from '@common/data'
import events from '@common/events'
import { findItemById, getNextSelectedItem, setOnStateOfItem, flatten as dotfileFnFlatten } from '@common/dotfileFn'
import * as dotfileFn from '@common/dotfileFn'
import { IFindShowSourceParam } from '@common/types'
import useI18n from '@renderer/models/useI18n'
import clsx from 'clsx'
import React, { useEffect, useState } from 'react'
import { BiChevronRight } from 'react-icons/bi'
import styles from './index.module.scss'
import ListItem from './ListItem'
import useConfigs from '@renderer/models/useConfigs'
import useDotfileData from '@renderer/models/useDotfileData'

interface Props {
  is_tray?: boolean
}

const List = (props: Props) => {
  const { is_tray } = props
  const { dotfile_data, loadDotfileData, setList, current_dotfile, setCurrentDotfile } = useDotfileData()
  const { configs } = useConfigs()
  const { lang } = useI18n()
  const [selected_ids, setSelectedIds] = useState<string[]>(current_dotfile?.id ? [current_dotfile.id] : [])
  const [show_list, setShowList] = useState<IDotfileListObject[]>([])
  const toast = useToast()

  useEffect(() => {
    // 确保 dotfile_data 和 list 存在
    if (!dotfile_data || !dotfile_data.list) {
      setShowList([])
      return
    }
    
    // 将 folder_open 转换为 is_collapsed（Tree 组件使用 is_collapsed）
    // 对于有 file_path 的文件夹（dotfile 文件夹）和 system_file 类型，始终展开且不能折叠
    const normalizedList = dotfile_data.list.map((item) => {
      if (item.type === 'folder' || item.type === 'system_file') {
        // 如果有 file_path，表示是 dotfile 文件夹或系统文件，应该始终展开
        if (item.file_path) {
          return {
            ...item,
            folder_open: true, // 强制设置为打开
            is_collapsed: false, // 强制设置为不折叠
          }
        }
        // 对于 system_file 类型，即使没有 file_path 也始终展开
        if (item.type === 'system_file') {
          return {
            ...item,
            folder_open: true,
            is_collapsed: false,
          }
        }
        return {
          ...item,
          is_collapsed: !item.folder_open, // folder_open 和 is_collapsed 是相反的
        }
      }
      return item
    })

    if (!is_tray) {
      // 直接显示列表
      setShowList([...normalizedList])
    } else {
      setShowList([...normalizedList])
    }
  }, [dotfile_data])

  const onToggleItem = async (id: string, on: boolean) => {
    console.log(`writeMode: ${configs?.write_mode}`)
    console.log(`toggle dotfile #${id} as ${on ? 'on' : 'off'}`)

    if (!configs?.write_mode) {
      agent.broadcast(events.show_set_write_mode, { id, on })
      return
    }

    const new_list = setOnStateOfItem(
      dotfile_data.list,
      id,
      on,
      configs?.choice_mode ?? 0,
      configs?.multi_chose_folder_switch_all ?? false,
    )
    let success = await writeDotfileToSystem(new_list)
    if (success) {
      toast({
        status: 'success',
        description: lang.success,
        isClosable: true,
      })
      agent.broadcast(events.set_dotfile_on_status, id, on)
    } else {
      agent.broadcast(events.set_dotfile_on_status, id, !on)
    }
  }

  const writeDotfileToSystem = async (
    list?: IDotfileListObject[],
    options?: IHostsWriteOptions,
  ): Promise<boolean> => {
    if (!Array.isArray(list)) {
      list = dotfile_data.list
    }

    // 检查是否是 dotfile 模式（包括 folder 和 system_file 类型）
    const hasDotfiles = list && list.some((item) => {
      const flat = dotfileFnFlatten([item])
      return flat.some((i) => i.file_path && (i.type === 'folder' || i.type === 'system_file'))
    })

    if (hasDotfiles && list) {
      // Dotfile 模式：使用新的写入逻辑
      const result = await actions.writeDotfilesToSystem(list, options)
      if (result.success) {
        setList(list).catch((e) => console.error(e))

        if (current_dotfile) {
          let dotfile = findItemById(list, current_dotfile.id)
          if (dotfile) {
            agent.broadcast(events.set_dotfile_on_status, current_dotfile.id, dotfile.on)
          }
        }
        
        toast({
          status: 'success',
          description: lang.success,
          isClosable: true,
        })
      } else {
        console.log('写入失败:', result)
        loadDotfileData().catch((e) => console.log(e))
        let err_desc = lang.fail

        // 检查是否有需要 sudo 权限的文件（code === 'no_access'）
        const needsSudoFiles = Object.entries(result.errors || {})
          .filter(([_, error]) => error.code === 'no_access')
          .map(([file]) => file)
        
        console.log('需要 sudo 权限的文件:', needsSudoFiles)
        
        if (needsSudoFiles.length > 0 && (agent.platform === 'darwin' || agent.platform === 'linux')) {
          // 显示 sudo 密码输入对话框
          agent.broadcast(events.show_sudo_password_input, list)
          err_desc = lang.no_access_to_file
        } else {
          // 其他错误，显示具体错误信息
          const errorMessages = Object.entries(result.errors || {})
            .map(([file, error]) => `${file}: ${error.message || error.code || 'unknown error'}`)
            .join('; ')
          err_desc = errorMessages || lang.fail
        }

        toast({
          status: 'error',
          description: err_desc,
          isClosable: true,
        })
      }

      agent.broadcast(events.tray_list_updated)
      return result.success
    }

    // 如果没有 dotfile，不做任何操作
    agent.broadcast(events.tray_list_updated)
    return false
  }

  if (!is_tray) {
    useOnBroadcast(events.toggle_item, onToggleItem, [dotfile_data, configs])
    useOnBroadcast(events.write_dotfile_to_system, writeDotfileToSystem, [dotfile_data])
  } else {
    useOnBroadcast(events.tray_list_updated, loadDotfileData)
  }

  useOnBroadcast(
    events.move_to_trashcan,
    async (ids: string[]) => {
      console.log(`move_to_trashcan: #${ids}`)
      await actions.moveManyToTrashcan(ids)
      await loadDotfileData()

      if (current_dotfile && ids.includes(current_dotfile.id)) {
        // 选中删除指定节点后的兄弟节点
        let next_item = getNextSelectedItem(dotfile_data.list, (i) => ids.includes(i.id))
        setCurrentDotfile(next_item || null)
        setSelectedIds(next_item ? [next_item.id] : [])
      }
    },
    [current_dotfile, dotfile_data],
  )

  useOnBroadcast(
    events.select_dotfile,
    async (id: string | null, wait_ms: number = 0) => {
      // 如果 id 为空字符串或 null，清空选中状态
      if (!id || id === '') {
        setCurrentDotfile(null)
        setSelectedIds([])
        return
      }
      
      let dotfile = findItemById(dotfile_data.list, id)
      if (!dotfile) {
        if (wait_ms > 0) {
          setTimeout(() => {
            agent.broadcast(events.select_dotfile, id, wait_ms - 50)
          }, 50)
        } else {
          // 如果找不到 dotfile，清空选中状态
          setCurrentDotfile(null)
          setSelectedIds([])
        }
        return
      }

      setCurrentDotfile(dotfile || null)
      setSelectedIds([id])
    },
    [dotfile_data],
  )

  useOnBroadcast(events.reload_list, async () => {
    // 刷新列表数据
    await loadDotfileData()
  })
  
  // 监听列表数据变化，检查当前选中的项是否还存在
  useEffect(() => {
    if (!dotfile_data?.list) return
    
    if (current_dotfile) {
      const still_exists = findItemById(dotfile_data.list, current_dotfile.id)
      if (!still_exists) {
        // 如果选中的项已经不存在，清空选中状态
        console.log('当前选中的项已不存在，清空选中状态')
        setCurrentDotfile(null)
        setSelectedIds([])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dotfile_data?.list])

  useOnBroadcast(events.dotfile_content_changed, async (dotfile_id: string) => {
    let list: IDotfileListObject[] = await actions.getList()
    let dotfile = findItemById(list, dotfile_id)
    if (!dotfile || !dotfile.on) return

    // 当前 dotfile 是开启状态，且内容发生了变化
    await writeDotfileToSystem(list)
  })

  useOnBroadcast(events.show_source, async (params: IFindShowSourceParam) => {
    agent.broadcast(events.select_dotfile, params.item_id)
  })

  return (
    <div className={styles.root}>
      {/*<SystemDotfileItem/>*/}
      <Tree
        data={show_list}
        selected_ids={selected_ids}
        onChange={(list) => {
          // 将 is_collapsed 转换回 folder_open（Tree 组件使用 is_collapsed，但我们需要保存 folder_open）
          // 对于有 file_path 的文件夹（dotfile 文件夹）或系统文件，不允许改变折叠状态
          const normalizedList = list.map((item) => {
            if (item.type === 'folder' || item.type === 'system_file') {
              // 如果有 file_path 或是 system_file 类型，表示是 dotfile 文件夹或系统文件，应该始终展开
              if ((item as any).file_path || item.type === 'system_file') {
                return {
                  ...item,
                  folder_open: true, // 强制设置为打开
                  is_collapsed: false, // 强制设置为不折叠
                }
              }
              return {
                ...item,
                folder_open: !item.is_collapsed, // folder_open 和 is_collapsed 是相反的
              }
            }
            return item
          })
          setShowList(normalizedList)
          setList(normalizedList).catch((e) => console.error(e))
        }}
        onSelect={(ids: string[]) => {
          // console.log(ids)
          setSelectedIds(ids)
        }}
        nodeRender={(data) => (
          <ListItem key={data.id} data={data} is_tray={is_tray} selected_ids={selected_ids} />
        )}
        collapseArrow={
          <Center w="20px" h="20px">
            <BiChevronRight />
          </Center>
        }
        nodeAttr={(item) => {
          const is_folder = item.type === 'folder' || item.type === 'system_file'
          // 对于有 file_path 的文件夹（dotfile 文件夹）或系统文件，始终展开且不能折叠
          const is_dotfile_folder = (item.type === 'folder' || item.type === 'system_file') && (item as any).file_path
          const is_system_file = item.type === 'system_file'
          return {
            can_drag: !item.is_sys && !is_tray,
            can_drop_before: !item.is_sys,
            can_drop_in: is_folder, // dotfile 文件夹和系统文件可以接受拖拽
            can_drop_after: !item.is_sys,
            // 对于 dotfile 文件夹或系统文件，强制设置为不折叠
            is_collapsed: (is_dotfile_folder || is_system_file) ? false : item.is_collapsed,
          }
        }}
        draggingNodeRender={(data) => {
          // 检查是否是默认配置项
          const is_default_item = data.id.endsWith('-default') || data.id === '0-default'
          // 所有 dotfile 文件夹（有 file_path 的文件夹）和系统相关的都使用电脑图标
          const is_dotfile_folder = (data.type === 'folder' || data.type === 'system_file') && (data as any).file_path
          const icon_type = data.type === 'system_file'
            ? 'system_file'
            : (data.is_sys && data.id === '0') || is_dotfile_folder || is_default_item
            ? 'system'
            : data.type
          
          return (
            <div className={clsx(styles.for_drag)}>
              <span className={clsx(styles.icon, data.type === 'folder' && styles.folder)}>
                <ItemIcon
                  type={icon_type}
                  is_collapsed={data.type === 'folder' ? !data.folder_open : data.is_collapsed}
                />
              </span>
              <span>
                {data.title || lang.untitled}
                {selected_ids.length > 1 ? (
                  <span className={styles.items_count}>
                    {selected_ids.length} {lang.items}
                  </span>
                ) : null}
              </span>
            </div>
          )
        }}
        nodeClassName={styles.node}
        nodeDropInClassName={styles.node_drop_in}
        nodeSelectedClassName={styles.node_selected}
        nodeCollapseArrowClassName={styles.arrow}
        allowed_multiple_selection={true}
      />
    </div>
  )
}

export default List
