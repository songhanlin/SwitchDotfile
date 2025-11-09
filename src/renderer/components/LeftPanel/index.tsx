/**
 * LeftPanel
 * @author: oldj
 * @homepage: https://oldj.net
 */

import Trashcan from '@renderer/components/LeftPanel/Trashcan'
import List from '@renderer/components/List'
import { agent } from '@renderer/core/agent'
import { PopupMenu } from '@renderer/core/PopupMenu'
import events from '@common/events'
import useI18n from '@renderer/models/useI18n'
import React from 'react'
import styles from './index.module.scss'
import useDotfileData from '@renderer/models/useDotfileData'

interface Props {
  width: number
}

const Index = (props: Props) => {
  const { lang } = useI18n()
  const { dotfile_data } = useDotfileData()

  const menu = new PopupMenu([
    {
      label: lang.dotfile_add,
      click() {
        agent.broadcast(events.add_new)
      },
    },
  ])

  return (
    <div className={styles.list} onContextMenu={() => menu.show()}>
      <List />
      {dotfile_data.trashcan.length > 0 ? <Trashcan /> : null}
    </div>
  )
}

export default Index
