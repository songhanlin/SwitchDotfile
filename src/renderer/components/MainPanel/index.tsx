/**
 * index
 * @author: oldj
 * @homepage: https://oldj.net
 */

import DotfileEditor from '@renderer/components/Editor/DotfileEditor'
import useOnBroadcast from '@renderer/core/useOnBroadcast'
import events from '@common/events'
import React from 'react'
import styles from './index.module.scss'
import { useToast } from '@chakra-ui/react'

const MainPanel = () => {
  const toast = useToast()

  useOnBroadcast(events.cmd_run_result, (result) => {
    // console.log(result)
    if (!result.success) {
      toast({
        status: 'error',
        description: result.stderr || 'cmd run error',
        isClosable: true,
      })
    }
  })

  return (
    <div className={styles.root}>
      <DotfileEditor />
    </div>
  )
}

export default MainPanel
