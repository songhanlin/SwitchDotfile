/**
 * DotfileViewer
 * @author: oldj
 * @homepage: https://oldj.net
 */

import StatusBar from '@renderer/components/StatusBar'
import React from 'react'
import styles from './DotfileViewer.module.scss'

interface Props {
  content: string
}

const DotfileViewer = (props: Props) => {
  const { content } = props
  const lines = content.split('\n')

  const Line = (p: { line: string }) => {
    return <div className={styles.line}>{p.line}</div>
  }

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        {lines.map((line, idx) => (
          <Line line={line} key={idx} />
        ))}
      </div>
      <StatusBar line_count={lines.length} bytes={content.length} read_only={true} />
    </div>
  )
}

export default DotfileViewer
