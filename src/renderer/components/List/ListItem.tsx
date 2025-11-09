/**
 * ListItem
 * @author: oldj
 * @homepage: https://oldj.net
 */

import ItemIcon from '@renderer/components/ItemIcon'
import SwitchButton from '@renderer/components/SwitchButton'
import { actions, agent } from '@renderer/core/agent'
import { PopupMenu } from '@renderer/core/PopupMenu'
import { IDotfileListObject } from '@common/data'
import { updateOneItem, flatten, getParentOfItem } from '@common/dotfileFn'
import clsx from 'clsx'
import React, { useEffect, useRef, useState } from 'react'
import { BiEdit } from 'react-icons/bi'
import { Center, ToastId, useToast } from '@chakra-ui/react'
import scrollIntoView from 'smooth-scroll-into-view-if-needed'
import styles from './ListItem.module.scss'
import events from '@common/events'
import { IMenuItemOption } from '@common/types'
import useI18n from '@renderer/models/useI18n'
import useDotfileData from '@renderer/models/useDotfileData'

interface Props {
  data: IDotfileListObject
  selected_ids: string[]
  is_tray?: boolean
}

const ListItem = (props: Props) => {
  const { data, is_tray, selected_ids } = props
  const { lang, i18n } = useI18n()
  const { dotfile_data, setList, current_dotfile, setCurrentDotfile, loadDotfileData } = useDotfileData()
  // 使用 folder_open 或 is_collapsed 来控制折叠状态
  const [is_collapsed, setIsCollapsed] = useState(
    data.type === 'folder' ? !data.folder_open : !!data.is_collapsed
  )
  const [is_on, setIsOn] = useState(data.on)
  const el = useRef<HTMLDivElement>(null)
  // const [item_height, setItemHeight] = useState(0)
  const ref_toast_refresh = useRef<ToastId | null>(null)

  const toast = useToast()

  useEffect(() => {
    // 系统默认配置项始终开启
    if (data.id.endsWith('-default') || data.id === '0-default') {
      setIsOn(true)
    } else {
      setIsOn(data.on)
    }
    // 同步折叠状态
    if (data.type === 'folder' || data.type === 'system_file') {
      // 对于有 file_path 的文件夹（dotfile 文件夹）或系统文件，始终展开
      if (data.file_path || data.type === 'system_file') {
        setIsCollapsed(false)
      } else {
        setIsCollapsed(!data.folder_open)
      }
    } else {
      setIsCollapsed(!!data.is_collapsed)
    }
  }, [data])

  useEffect(() => {
    const is_selected = data.id === current_dotfile?.id

    if (is_selected && el.current) {
      // el.current.scrollIntoViewIfNeeded()
      scrollIntoView(el.current, {
        behavior: 'smooth',
        scrollMode: 'if-needed',
      })
    }
  }, [data, current_dotfile, el])

  const onSelect = () => {
    // 打印项目类型信息
    console.log('=== 点击项目信息 ===')
    console.log('ID:', data.id)
    console.log('类型 (type):', data.type)
    console.log('是否为系统项 (is_sys):', data.is_sys)
    console.log('标题 (title):', data.title)
    console.log('文件路径 (file_path):', data.file_path)
    console.log('是否为文件夹:', data.type === 'folder')
    console.log('是否开启 (on):', data.on)
    console.log('是否有子项 (children):', data.children ? `${data.children.length} 个` : '无')
    console.log('完整数据:', JSON.stringify(data, null, 2))
    console.log('==================')
    
    // 检查是否是默认配置项
    const is_default_item = data.id.endsWith('-default') || data.id === '0-default'
    
    // 允许选中的系统项：
    // 1. System Hosts 文件夹（id === '0'）
    // 2. 默认配置项（需要显示合并后的内容）
    // 3. dotfile 文件夹（type === 'folder' && file_path）
    if (data.is_sys && data.id === '0' && data.type === 'folder') {
      // System Hosts 文件夹：设置为当前选中项
      setCurrentDotfile(data)
    } else if (is_default_item) {
      // 默认配置项：允许选中，以便显示其父文件夹的合并内容
      setCurrentDotfile(data)
    } else if ((data.type === 'folder' || data.type === 'system_file') && data.file_path) {
      // dotfile 文件夹或系统文件：允许选中
      setCurrentDotfile(data)
    } else {
      // 其他系统项不允许选中
      setCurrentDotfile(data.is_sys ? null : data)
    }
  }

  const toggleIsCollapsed = () => {
    if (!is_folder) return
    // 对于有 file_path 的文件夹（dotfile 文件夹）或系统文件类型，不允许折叠
    if (data.file_path || data.type === 'system_file') return

    let _is_collapsed = !is_collapsed
    setIsCollapsed(_is_collapsed)
    // 对于 folder 类型，使用 folder_open 字段（取反）
    const updated = updateOneItem(dotfile_data.list, {
      id: data.id,
      folder_open: !_is_collapsed, // folder_open 和 is_collapsed 是相反的
      is_collapsed: _is_collapsed,
    })
    setList(updated).catch((e) => console.error(e))
  }

  const toggleOn = (on?: boolean) => {
    on = typeof on === 'boolean' ? on : !is_on
    setIsOn(on)

    agent.broadcast(events.toggle_item, data.id, on)
  }

  if (!data) return null

  // dotfile 文件夹类型和系统文件类型可以展开
  const is_folder = data.type === 'folder' || data.type === 'system_file'
  const is_selected = data.id === current_dotfile?.id
  
  // 检查是否是默认配置项
  const is_default_item = data.id.endsWith('-default') || data.id === '0-default'
  
  // 如果是默认配置项，获取其父文件夹（用于显示相同的图标和功能）
  let parent_folder: IDotfileListObject | undefined
  if (is_default_item) {
    // 使用 getParentOfItem 获取父文件夹
    parent_folder = getParentOfItem(dotfile_data.list, data.id)
    // 确保父文件夹是 dotfile 文件夹或系统文件（有 file_path）
    if (parent_folder && (!parent_folder.file_path || (parent_folder.type !== 'folder' && parent_folder.type !== 'system_file'))) {
      parent_folder = undefined
    }
  }
  
  // 对于默认配置项，其"视觉类型"应该和父文件夹一致（使用文件夹图标）
  const visual_type = is_default_item && parent_folder ? 'folder' : data.type
  const visual_is_folder = visual_type === 'folder'

  return (
    <div
      className={clsx(styles.root, is_selected && styles.selected, is_tray && styles.is_tray)}
      // className={clsx(styles.item, is_selected && styles.selected, is_collapsed && styles.is_collapsed)}
      // style={{ paddingLeft: `${1.3 * level}em` }}
      onContextMenu={(e) => {
        let deal_count = 1
        if (selected_ids.includes(data.id)) {
          deal_count = selected_ids.length
        }

        let menu_items: IMenuItemOption[] = [
          {
            label: lang.edit,
            click() {
              agent.broadcast(events.edit_dotfile_info, data)
            },
          },
        ]

        // 如果是文件夹或系统文件，添加"添加配置项"选项
        if (data.type === 'folder' || data.type === 'system_file') {
          menu_items.push({
            label: '添加配置项',
            click() {
              agent.broadcast(events.add_new_in_folder, data.id)
            },
          })
        }
        
        // 只有 system_file 类型可以移除管理
        if (data.type === 'system_file') {
          menu_items.push({
            label: '移除管理',
            click() {
              // 确认对话框
              const file_path = data.file_path || ''
              if (confirm(`确定要移除该 dotfile 的管理吗？\n\n文件路径: ${file_path}\n\n这将：\n1. 删除该文件夹及其所有自定义配置\n2. 将系统文件还原为默认配置\n\n注意：如果系统文件需要管理员权限，可能需要输入密码。`)) {
                ref_toast_refresh.current = toast({
                  status: 'loading',
                  description: '正在移除管理...',
                })
                
                actions.removeDotfileManagement(data.id)
                  .then((result) => {
                    if (ref_toast_refresh.current) {
                      toast.close(ref_toast_refresh.current)
                    }
                    
                    console.log('移除管理结果:', result)
                    
                    if (result.success) {
                      // 如果成功但有警告消息，显示警告
                      if (result.message) {
                        toast({
                          status: 'warning',
                          description: result.message,
                          isClosable: true,
                          duration: 5000,
                        })
                      } else {
                        toast({
                          status: 'success',
                          description: '已移除管理',
                          isClosable: true,
                        })
                      }
                      // 刷新列表和界面
                      loadDotfileData().catch((e) => console.error('刷新列表失败:', e))
                      // 清空选中状态，确保编辑器也清空内容
                      agent.broadcast(events.select_dotfile, '')
                    } else {
                      console.error('移除失败:', result.message)
                      toast({
                        status: 'error',
                        description: result.message || '移除失败',
                        isClosable: true,
                        duration: 5000,
                      })
                    }
                  })
                  .catch((e) => {
                    if (ref_toast_refresh.current) {
                      toast.close(ref_toast_refresh.current)
                    }
                    console.error('移除管理异常:', e)
                    console.error('错误堆栈:', e.stack)
                    toast({
                      status: 'error',
                      description: e.message || e.toString() || '移除失败',
                      isClosable: true,
                      duration: 5000,
                    })
                  })
              }
            },
          })
        }

        menu_items.push({
          label: lang.refresh,
          async click() {
            ref_toast_refresh.current = toast({
              status: 'loading',
              description: lang.loading,
            })

            actions
              .refreshDotfile(data.id)
              .then((r) => {
                console.log(r)
                if (!r.success) {
                  toast({
                    status: 'error',
                    description: r.message || r.code || 'Error!',
                    isClosable: true,
                  })
                  return
                }

                toast({
                  status: 'success',
                  description: 'OK!',
                  isClosable: true,
                })
              })
              .catch((e) => {
                console.log(e)
                toast({
                  status: 'error',
                  description: e.message,
                  isClosable: true,
                })
              })
              .finally(() => {
                if (ref_toast_refresh.current) {
                  toast.close(ref_toast_refresh.current)
                }
              })
          },
        })

        menu_items.push({
          type: 'separator',
        })

        // 默认配置项和 system_file 类型不能被删除（只能通过移除管理来删除）
        const is_default_item = data.id.endsWith('-default') || data.id === '0-default'
        const is_system_file = data.type === 'system_file'
        if (!is_default_item && !is_system_file) {
          menu_items.push({
            label:
              deal_count === 1
                ? lang.move_to_trashcan
                : i18n.trans('move_items_to_trashcan', [deal_count.toLocaleString()]),
            click() {
              let ids = deal_count === 1 ? [data.id] : selected_ids
              agent.broadcast(events.move_to_trashcan, ids)
            },
          })
        }

        if (data.type !== 'remote') {
          menu_items = menu_items.filter((i) => i.label !== lang.refresh)
        }

        const menu = new PopupMenu(menu_items)

        // System Hosts 文件夹（id === '0'）和 dotfile 文件夹应该显示右键菜单，以便添加配置项
        // 默认配置项不应该显示菜单（它代表的是父文件夹的内容）
        // 但是 dotfile 文件夹应该显示菜单
        const is_dotfile_folder = is_folder && data.file_path
        const should_show_menu = (
          (!data.is_sys || (data.id === '0' && data.type === 'folder')) && 
          !is_default_item &&
          !is_tray
        ) || (is_dotfile_folder && !is_tray)
        if (should_show_menu) {
          menu.show()
        }
        e.preventDefault()
        e.stopPropagation()
      }}
      ref={el}
      onClick={(e: React.MouseEvent) => {
        if (is_tray) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      <div className={styles.title} onClick={onSelect}>
        <span 
          className={clsx(styles.icon, visual_is_folder && styles.folder)} 
          onClick={(e) => {
            // 对于有 file_path 的文件夹（dotfile 文件夹）和默认配置项，不允许点击折叠
            if ((is_folder && data.file_path) || is_default_item) {
              e.stopPropagation()
              return
            }
            toggleIsCollapsed()
          }}
        >
          <ItemIcon
            type={
              // 所有 dotfile 文件夹（有 file_path 的文件夹）和系统相关的都使用电脑图标：
              // 1. 系统 dotfile 文件夹（id === '0'）
              // 2. system_file 类型直接使用 system_file 图标
              // 3. 所有 dotfile 文件夹（type === 'folder' && file_path）
              // 4. 所有默认配置项（系统默认配置）
              // 其他使用自己的类型
              data.type === 'system_file'
                ? 'system_file'
                : (data.is_sys && data.id === '0') || 
                  (is_folder && data.file_path) || 
                  is_default_item
                ? 'system'
                : data.type
            }
            is_collapsed={visual_is_folder ? (parent_folder?.folder_open ? false : !data.folder_open) : data.is_collapsed}
          />
        </span>
        <span>
          {data.is_sys && data.id === '0' 
            ? lang.system_dotfile 
            : data.is_sys && data.id === '0-default'
            ? lang.system_default_dotfile
            : data.id.endsWith('-default')
            ? lang.system_default_config
            : (data.title || lang.untitled)}
          {/* 显示文件路径：文件夹显示自己的路径，默认配置项显示父文件夹的路径 */}
          {((is_folder && data.file_path) || (is_default_item && parent_folder?.file_path)) && (
            <span style={{ marginLeft: '8px', opacity: 0.6, fontSize: '0.9em' }}>
              ({is_default_item && parent_folder?.file_path ? parent_folder.file_path : data.file_path})
            </span>
          )}
        </span>
      </div>
      <div className={styles.status}>
        {/* 系统 dotfile 文件夹（id === '0'）本身不显示编辑和开关 */}
        {data.is_sys && data.id === '0' ? null : (
          <>
            {/* 默认配置项不显示编辑按钮，但显示开关（禁用状态） */}
            {data.id.endsWith('-default') || data.id === '0-default' ? null : (
              <div className={styles.edit}>
                <Center h="var(--swh-tree-row-height)">
                  <BiEdit
                    title={lang.edit}
                    onClick={() => {
                      agent.broadcast(events.edit_dotfile_info, data)
                    }}
                  />
                </Center>
              </div>
            )}
            {/* 系统默认配置项：开关始终开启且禁用 */}
            <SwitchButton 
              on={data.id.endsWith('-default') || data.id === '0-default' ? true : !!is_on} 
              onChange={(on) => {
                // 系统默认配置项的开关不能关闭
                if (data.id.endsWith('-default') || data.id === '0-default') {
                  return
                }
                toggleOn(on)
              }} 
              disabled={data.id.endsWith('-default') || data.id === '0-default'}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default ListItem
