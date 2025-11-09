/**
 * DotfileEditor
 * @author: oldj
 * @homepage: https://oldj.net
 */

import StatusBar from '@renderer/components/StatusBar'
import { actions, agent } from '@renderer/core/agent'
import useOnBroadcast from '@renderer/core/useOnBroadcast'
import { IDotfileListObject } from '@common/data'
import { getParentOfItem } from '@common/dotfileFn'
import events from '@common/events'
import { IFindShowSourceParam } from '@common/types'
import wait from '@common/utils/wait'
import { useDebounceFn } from 'ahooks'
import clsx from 'clsx'
import CodeMirror from 'codemirror'
import 'codemirror/addon/comment/comment'
import 'codemirror/addon/selection/mark-selection'
import React, { useEffect, useRef, useState } from 'react'
import modeHosts from './cm_hl'
import './codemirror.module.scss'
import styles from './DotfileEditor.module.scss'
import useDotfileData from '@renderer/models/useDotfileData'
import useConfigs from '@renderer/models/useConfigs'

modeHosts()

/**
 * 深度合并两个对象（用于 JSON 配置合并）
 */
const deepMergeObjects = (target: any, source: any): any => {
  if (typeof target !== 'object' || target === null) {
    return source
  }
  if (typeof source !== 'object' || source === null) {
    return source
  }
  
  // 如果是数组，直接返回源数组（可以根据需求调整策略）
  if (Array.isArray(source)) {
    return source
  }
  
  const merged = { ...target }
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        // 递归合并嵌套对象
        merged[key] = deepMergeObjects(target[key], source[key])
      } else {
        // 直接覆盖（后添加的配置项优先级更高）
        merged[key] = source[key]
      }
    }
  }
  
  return merged
}

const DotfileEditor = () => {
  const { current_dotfile, dotfile_data, isReadOnly } = useDotfileData()
  const { configs } = useConfigs()
  const [dotfile_id, setDotfileId] = useState(current_dotfile?.id || '')
  const [content, setContent] = useState('')
  const [is_read_only, setIsReadOnly] = useState(true)
  const [find_params, setFindParams] = useState<IFindShowSourceParam | null>(null)
  const ref_el = useRef<HTMLTextAreaElement>(null)
  const ref_cm = useRef<CodeMirror.EditorFromTextArea | null>(null)

  const loadContent = async (is_new = false) => {
    let cm_editor = ref_cm.current
    if (!cm_editor) {
      setTimeout(loadContent, 100)
      return
    }

    // 如果没有选中任何项，显示空内容
    if (!dotfile_id || !current_dotfile) {
      setContent('')
      cm_editor.setValue('')
      if (is_new) {
        cm_editor.clearHistory()
      }
      return
    }

    let content = ''
    
    // 检查是否是默认配置项（系统默认配置项）
    const is_default_item = current_dotfile && current_dotfile.id.endsWith('-default')
    
    // 如果是默认配置项，获取其父文件夹
    let target_folder: IDotfileListObject | null = null
    if (is_default_item && current_dotfile) {
      const parent = getParentOfItem(dotfile_data.list, current_dotfile.id)
      if (parent && (parent.type === 'folder' || parent.type === 'system_file') && parent.file_path) {
        target_folder = parent
      }
    }
    
    // 默认配置项：显示系统文件的完整内容（包括系统原始内容和管理的内容）
    // 在追加模式下，系统文件包含：系统原始内容 + 标记 + 管理的内容 + 标记
    // 所以直接读取系统文件的完整内容即可
    if (is_default_item && target_folder) {
      if (target_folder.file_path) {
        try {
          // 直接读取系统文件的完整内容
          content = await actions.getSystemDotfile(target_folder.file_path) || ''
        } catch (e) {
          console.error('Failed to read system file:', e)
          content = ''
        }
      } else {
        content = ''
      }
    }
    // dotfile 文件夹或系统文件：显示系统文件的完整内容（包括系统原始内容和管理的内容）
    // 在追加模式下，系统文件包含：系统原始内容 + 标记 + 管理的内容 + 标记
    // 所以直接读取系统文件的完整内容即可
    else if ((current_dotfile?.type === 'folder' || current_dotfile?.type === 'system_file') && current_dotfile?.file_path) {
      // 直接读取系统文件的完整内容
      try {
        content = await actions.getSystemDotfile(current_dotfile.file_path) || ''
      } catch (e) {
        console.error('Failed to read system file:', e)
        content = ''
      }
    }
    // 其他配置项：从数据库读取内容
    else {
      content = await actions.getDotfileContent(dotfile_id) || ''
    }
    
    setContent(content)
    cm_editor.setValue(content)
    if (is_new) {
      cm_editor.clearHistory()
    }
  }

  useEffect(() => {
    // console.log(current_dotfile)
    const new_dotfile_id = current_dotfile?.id || ''
    setDotfileId(new_dotfile_id)
    let is_readonly = isReadOnly(current_dotfile)
    setIsReadOnly(is_readonly)
    if (ref_cm.current) {
      ref_cm.current.setOption('readOnly', is_readonly)
    }
    
    // 如果 current_dotfile 变为 null，立即清空内容
    if (!current_dotfile) {
      setContent('')
      if (ref_cm.current) {
        ref_cm.current.setValue('')
        ref_cm.current.clearHistory()
      }
    }
  }, [current_dotfile])

  useEffect(() => {
    console.log(dotfile_id)
    loadContent(true).catch((e) => console.error(e))
  }, [dotfile_id])

  const { run: toSave } = useDebounceFn(
    (id: string, content: string) => {
      actions
        .setDotfileContent(id, content)
        .then(() => {
          agent.broadcast(events.dotfile_content_changed, id)
          // 如果是 dotfile 且已开启，立即写入到系统文件
          if (current_dotfile?.file_path && current_dotfile?.on) {
            actions.setSystemDotfile(current_dotfile.file_path, content).catch((e) => {
              console.error('Failed to write dotfile to system:', e)
            })
          }
        })
        .catch((e) => console.error(e))
    },
    { wait: 1000 },
  )

  const onChange = (content: string) => {
    setContent(content)
    toSave(dotfile_id, content)
  }

  const toggleComment = () => {
    let cm_editor = ref_cm.current
    if (is_read_only || !cm_editor) return
    cm_editor.toggleComment()

    // 光标移到下一行
    let cursor = cm_editor.getCursor()
    cursor.line += 1
    cm_editor.setCursor(cursor)
  }

  const onGutterClick = (n: number) => {
    let cm_editor = ref_cm.current
    if (is_read_only || !cm_editor) return

    let info = cm_editor.lineInfo(n)
    let line = info.text
    if (/^\s*$/.test(line)) return

    let new_line: string
    if (/^#/.test(line)) {
      new_line = line.replace(/^#\s*/, '')
    } else {
      new_line = '# ' + line
    }

    cm_editor
      .getDoc()
      .replaceRange(new_line, { line: info.line, ch: 0 }, { line: info.line, ch: line.length })
  }

  useEffect(() => {
    if (!ref_el.current) return

    let cm = CodeMirror.fromTextArea(ref_el.current, {
      lineNumbers: true,
      readOnly: is_read_only,
      mode: 'dotfile',
    })
    ref_cm.current = cm

    cm.setSize('100%', '100%')

    cm.on('change', (editor) => {
      let value = editor.getDoc().getValue()
      agent.broadcast(events.editor_content_change, value)
    })

    cm.on('gutterClick', (cm, n) => {
      agent.broadcast(events.editor_gutter_click, n)
    })
  }, [])

  useEffect(() => {
    if (find_params && find_params.item_id === dotfile_id) {
      setSelection(find_params, true).catch((e) => console.error(e))
    }
  }, [dotfile_id, find_params])

  useOnBroadcast(
    events.editor_content_change,
    (new_content: string) => {
      if (new_content === content) return
      onChange(new_content)
    },
    [dotfile_id, content],
  )

  useOnBroadcast(
    events.dotfile_refreshed,
    (h: IDotfileListObject) => {
      if (dotfile_id !== '0' && h.id !== dotfile_id) return
      loadContent().catch((e) => console.error(e))
    },
    [dotfile_id],
  )

  useOnBroadcast(
    events.dotfile_refreshed_by_id,
    (id: string) => {
      if (dotfile_id !== '0' && dotfile_id !== id) return
      loadContent().catch((e) => console.error(e))
    },
    [dotfile_id, dotfile_data],
  )

  useOnBroadcast(
    events.set_dotfile_on_status,
    () => {
      // 如果当前没有选中任何项，不加载内容（保持空白）
      if (!current_dotfile) {
        return
      }
      // 如果当前显示的是文件夹、系统文件或默认配置项，当子项的开关状态改变时，需要重新加载内容
      if (((current_dotfile?.type === 'folder' || current_dotfile?.type === 'system_file') && current_dotfile?.file_path) ||
          (current_dotfile && current_dotfile.id.endsWith('-default'))) {
        loadContent().catch((e) => console.error(e))
      }
    },
    [dotfile_id, current_dotfile],
  )

  useOnBroadcast(
    events.system_dotfile_updated,
    () => {
      // 如果当前没有选中任何项，不加载内容（保持空白）
      if (!current_dotfile) {
        return
      }
      // 如果当前显示的是文件夹、系统文件或默认配置项，当系统文件更新时，需要重新加载内容
      if (((current_dotfile?.type === 'folder' || current_dotfile?.type === 'system_file') && current_dotfile?.file_path) ||
          (current_dotfile && current_dotfile.id.endsWith('-default'))) {
        loadContent().catch((e) => console.error(e))
      }
    },
    [dotfile_id, current_dotfile],
  )

  useOnBroadcast(events.editor_gutter_click, onGutterClick, [is_read_only])
  useOnBroadcast(events.toggle_comment, toggleComment, [is_read_only])

  const setSelection = async (params: IFindShowSourceParam, repeat = false) => {
    let cm_editor = ref_cm.current
    if (!cm_editor) return
    let doc = cm_editor.getDoc()

    doc.setSelection(
      {
        line: params.line - 1,
        ch: params.line_pos,
      },
      {
        line: params.end_line - 1,
        ch: params.end_line_pos,
      },
    )

    // console.log(doc.getSelection())
    await wait(200)
    if (!doc.getSelection()) {
      await setSelection(params)
    }
    cm_editor.focus()
  }

  useOnBroadcast(
    events.show_source,
    async (params: IFindShowSourceParam) => {
      if (!ref_cm.current) return

      if (params.item_id !== dotfile_id) {
        setFindParams(params)
        setTimeout(() => {
          setFindParams(null)
        }, 3000)
        return
      }

      setSelection(params).catch((e) => console.error(e))
    },
    [dotfile_id],
  )

  return (
    <div className={styles.root}>
      <div className={clsx(styles.editor, is_read_only && styles.read_only)}>
        <textarea
          ref={ref_el}
          defaultValue={content}
          // onChange={e => onChange(e.target.value)}
          // disabled={is_read_only}
        />
      </div>

      <StatusBar
        line_count={content.split('\n').length}
        bytes={content.length}
        read_only={is_read_only}
      />
    </div>
  )
}

export default DotfileEditor
