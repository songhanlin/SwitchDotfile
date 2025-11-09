/**
 * index
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { Box, Flex, HStack, IconButton } from '@chakra-ui/react'
import ItemIcon from '@renderer/components/ItemIcon'
import SwitchButton from '@renderer/components/SwitchButton'
import ConfigMenu from '@renderer/components/TopBar/ConfigMenu'
import { actions, agent } from '@renderer/core/agent'
import useOnBroadcast from '@renderer/core/useOnBroadcast'
import events from '@common/events'
import useDotfileData from '@renderer/models/useDotfileData'
import useI18n from '@renderer/models/useI18n'
import React, { useEffect, useState } from 'react'
import { BiX } from 'react-icons/bi'
import {
  IconHistory,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconPlus,
} from '@tabler/icons-react'
import styles from './index.module.scss'

interface IProps {
  show_left_panel: boolean
  use_system_window_frame: boolean
}

export default (props: IProps) => {
  const { show_left_panel, use_system_window_frame } = props
  const { lang } = useI18n()
  const { isDotfileInTrashcan, current_dotfile, isReadOnly } = useDotfileData()
  const [is_on, setIsOn] = useState(!!current_dotfile?.on)

  const show_toggle_switch =
    !show_left_panel && current_dotfile && !isDotfileInTrashcan(current_dotfile.id)
  const show_history = !current_dotfile
  const show_close_button =
    (agent.platform === 'linux' && !use_system_window_frame) ||
    (agent.platform !== 'darwin' && agent.platform !== 'linux')

  useEffect(() => {
    setIsOn(!!current_dotfile?.on)
  }, [current_dotfile])

  useOnBroadcast(
    events.set_dotfile_on_status,
    (id: string, on: boolean) => {
      if (current_dotfile && current_dotfile.id === id) {
        setIsOn(on)
      }
    },
    [current_dotfile],
  )

  return (
    <div className={styles.root}>
      <Flex align="center" className={styles.left}>
        <IconButton
          aria-label="Toggle sidebar"
          icon={
            show_left_panel ? (
              <IconLayoutSidebarLeftCollapse size={16} />
            ) : (
              <IconLayoutSidebarLeftExpand size={16} />
            )
          }
          onClick={() => {
            agent.broadcast(events.toggle_left_panel, !show_left_panel)
          }}
          variant="ghost"
          mr={1}
        />
        <IconButton
          aria-label="Add"
          icon={<IconPlus size={16} />}
          onClick={() => agent.broadcast(events.add_new)}
          variant="ghost"
        />
      </Flex>

      <Box className={styles.title_wrapper}>
        <HStack className={styles.title}>
          {current_dotfile ? (
            <>
              <span className={styles.dotfile_icon}>
                <ItemIcon 
                  type={
                    // 所有 dotfile 文件夹（有 file_path 的文件夹）和系统相关的都使用电脑图标
                    (current_dotfile.is_sys && current_dotfile.id === '0') || 
                    (current_dotfile.type === 'folder' && current_dotfile.file_path) ||
                    current_dotfile.id.endsWith('-default') || 
                    current_dotfile.id === '0-default'
                      ? 'system'
                      : current_dotfile.type
                  } 
                  is_collapsed={!current_dotfile.folder_open} 
                />
              </span>
              <span className={styles.dotfile_title}>{current_dotfile.title || lang.untitled}</span>
            </>
          ) : (
            <>
              <span className={styles.dotfile_icon}>
                <ItemIcon type="system" />
              </span>
              <span className={styles.dotfile_title}>{lang.system_dotfile}</span>
            </>
          )}

          {isReadOnly(current_dotfile) ? (
            <span className={styles.read_only}>{lang.read_only}</span>
          ) : null}
        </HStack>
      </Box>

      <Flex align="center" justifyContent="flex-end" className={styles.right}>
        {show_toggle_switch ? (
          <Box mr={3}>
            <SwitchButton
              on={is_on}
              onChange={(on) => {
                current_dotfile && agent.broadcast(events.toggle_item, current_dotfile.id, on)
              }}
            />
          </Box>
        ) : null}
        {show_history ? (
          <IconButton
            aria-label="Show history"
            icon={<IconHistory size={16} />}
            variant="ghost"
            onClick={() => agent.broadcast(events.show_history)}
          />
        ) : null}

        <ConfigMenu />

        {show_close_button ? (
          <IconButton
            aria-label="Close window"
            fontSize="20px"
            icon={<BiX />}
            variant="ghost"
            onClick={() => actions.closeMainWindow()}
          />
        ) : null}
      </Flex>
    </div>
  )
}
