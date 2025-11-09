/**
 * SystemDotfileItem
 * @author: oldj
 * @homepage: https://oldj.net
 */

import ItemIcon from '@renderer/components/ItemIcon'
import clsx from 'clsx'
import React from 'react'
import styles from './SystemDotfileItem.module.scss'
import useI18n from '@renderer/models/useI18n'
import useDotfileData from '@renderer/models/useDotfileData'

const SystemDotfileItem = () => {
  const { i18n } = useI18n()
  const { current_dotfile, setCurrentDotfile } = useDotfileData()

  const is_selected = !current_dotfile

  const showSystemHosts = () => {
    setCurrentDotfile(null)
  }

  return (
    <div className={clsx(styles.root, is_selected && styles.selected)} onClick={showSystemHosts}>
      <span className={styles.icon}>
        <ItemIcon type="system" />
      </span>
      <span>{i18n.lang.system_dotfile}</span>
    </div>
  )
}

export default SystemDotfileItem
