/**
 * 设置系统 dotfile 的内容（写入到实际文件）
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { configGet, deleteHistory, getHistoryList, updateTrayTitle } from '@main/actions'
import tryToRun from '@main/actions/cmd/tryToRun'
import { broadcast } from '@main/core/agent'
import { swhdb } from '@main/data'
import safePSWD from '@main/libs/safePSWD'
import { IHostsWriteOptions } from '@main/types'
import { IDotfileHistoryObject } from '@common/data'
import events from '@common/events'
import { exec, spawn } from 'child_process'
import * as fs from 'fs'
import md5 from 'md5'
import md5File from 'md5-file'
import * as os from 'os'
import * as path from 'path'
import { v4 as uuid4 } from 'uuid'
import getDotfilePath from './getDotfilePath'

// 标记我们管理的内容的开始和结束
const CONTENT_START = '# --- DOTFILE_MANAGER_CONTENT_START ---'
const CONTENT_END = '# --- DOTFILE_MANAGER_CONTENT_END ---'

interface IWriteResult {
  success: boolean
  code?: string
  message?: string
  old_content?: string
  new_content?: string
}

let sudo_pswd: string = ''

const checkAccess = async (fn: string): Promise<boolean> => {
  try {
    await fs.promises.access(fn, fs.constants.W_OK)
    return true
  } catch (e) {
    // console.error(e)
  }
  return false
}

const addHistory = async (file_path: string, content: string) => {
  await swhdb.collection.history.insert({
    id: uuid4(),
    content,
    add_time_ms: new Date().getTime(),
    file_path, // 保存文件路径以便区分不同文件的历史
  })

  let history_limit = await configGet('history_limit')
  if (typeof history_limit !== 'number' || history_limit <= 0) return

  let lists = await swhdb.collection.history.all<IDotfileHistoryObject & { file_path?: string }>()
  // 只保留该文件的历史记录
  let file_histories = lists.filter((h) => h.file_path === file_path)
  if (file_histories.length <= history_limit) {
    return
  }

  // 删除超出限制的历史记录
  file_histories.sort((a, b) => a.add_time_ms - b.add_time_ms)
  for (let i = 0; i < file_histories.length - history_limit; i++) {
    if (!file_histories[i] || !file_histories[i].id) break
    await deleteHistory(file_histories[i].id)
  }
}

const writeWithSudo = (abs_path: string, content: string): Promise<IWriteResult> =>
  new Promise((resolve) => {
    let tmp_fn = path.join(os.tmpdir(), `dotfile_${new Date().getTime()}_${Math.random()}.txt`)
    fs.writeFileSync(tmp_fn, content, 'utf-8')

    // 使用和 setSystemHosts 完全相同的方式
    // 注意：路径不使用引号，因为 setSystemHosts 也是这样做的
    let cmd = [
      `echo '${sudo_pswd}' | sudo -S chmod 777 ${abs_path}`,
      `cat "${tmp_fn}" > ${abs_path}`,
      `echo '${sudo_pswd}' | sudo -S chmod 644 ${abs_path}`,
    ].join(' && ')

    exec(cmd, function (error, stdout, stderr) {
      // command output is in stdout
      console.log('stdout', stdout)
      console.log('stderr', stderr)

      if (fs.existsSync(tmp_fn)) {
        fs.unlinkSync(tmp_fn)
      }

      let result: IWriteResult

      if (!error) {
        console.log('success.')
        result = {
          success: true,
        }
      } else {
        console.log('fail!')
        sudo_pswd = ''
        result = {
          success: false,
          code: 'no_access',
          message: stderr || error?.message || 'Permission denied',
        }
      }

      resolve(result)
    })
  })

const write = async (
  file_path: string,
  content: string,
  options?: IHostsWriteOptions,
): Promise<IWriteResult> => {
  const abs_path = getDotfilePath(file_path)
  
  // 确保目录存在
  const dir = path.dirname(abs_path)
  try {
    await fs.promises.mkdir(dir, { recursive: true })
  } catch (e) {
    console.error('Failed to create directory:', e)
  }

  let old_content: string = ''
  let file_exists = false
  
  try {
    old_content = await fs.promises.readFile(abs_path, 'utf-8')
    file_exists = true
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      console.error(e)
    }
  }

  // 如果内容相同，不需要写入
  if (file_exists) {
    const content_md5 = md5(content)
    const file_md5 = md5(old_content)
    if (content_md5 === file_md5) {
      return { success: true }
    }
  }

  // 但这里我们统一使用 setSystemDotfile，只是需要确保权限处理正确
  let has_access = await checkAccess(abs_path)
  if (!has_access) {
    if (options && options.sudo_pswd) {
      sudo_pswd = safePSWD(options.sudo_pswd)
    }

    let platform = process.platform
    if ((platform === 'darwin' || platform === 'linux') && sudo_pswd) {
      let result = await writeWithSudo(abs_path, content)
      if (result.success) {
        result.old_content = old_content
        result.new_content = content
      }
      return result
    }

    // 如果没有提供 sudo 密码，返回 no_access 错误，触发密码输入对话框
    return {
      success: false,
      code: 'no_access',
      message: 'No permission to write file. Please provide sudo password.',
    }
  }

  try {
    await fs.promises.writeFile(abs_path, content, 'utf-8')
  } catch (e: any) {
    console.error(e)
    let code = 'fail'
    if (e.code === 'EPERM' || e.message.includes('operation not permitted')) {
      code = 'no_access'
    }

    return {
      success: false,
      code,
      message: e.message,
    }
  }

  return { success: true, old_content, new_content: content }
}

/**
 * 创建追加模式的内容
 * 读取系统文件的原始内容，移除我们管理的内容，然后追加新的内容
 */
const makeAppendContent = async (file_path: string, content: string): Promise<string> => {
  const abs_path = getDotfilePath(file_path)
  let old_content = ''
  
  try {
    old_content = await fs.promises.readFile(abs_path, 'utf-8')
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      // 文件不存在，直接返回新内容
      if (!content) {
        return ''
      }
      return `${CONTENT_START}\n\n${content}\n\n${CONTENT_END}`
    }
    throw e
  }

  // 查找我们管理的内容区域
  const start_index = old_content.indexOf(CONTENT_START)
  const end_index = old_content.indexOf(CONTENT_END)
  
  let system_content = ''
  if (start_index > -1 && end_index > -1 && end_index > start_index) {
    // 找到了我们管理的内容区域，提取系统原始内容（标记之前的内容）
    // 同时也提取标记之后的内容（如果有），这样可以保留标记之后的系统内容
    const before_markers = old_content.substring(0, start_index)
    const after_markers = old_content.substring(end_index + CONTENT_END.length)
    // 合并标记之前和之后的内容作为系统内容
    system_content = (before_markers + after_markers).trimEnd()
  } else {
    // 没有找到标记，说明整个文件都是系统原始内容
    // 这是第一次管理该文件，保留所有现有内容作为系统原始内容
    system_content = old_content.trimEnd()
  }

  if (!content || !content.trim()) {
    // 如果没有新内容，只返回系统原始内容（移除所有标记）
    return system_content || ''
  }

  // 返回系统原始内容 + 我们管理的内容
  // 如果系统内容为空，不添加额外的换行
  if (!system_content) {
    return `${CONTENT_START}\n\n${content}\n\n${CONTENT_END}`
  }
  return `${system_content}\n\n${CONTENT_START}\n\n${content}\n\n${CONTENT_END}`
}

const setSystemDotfile = async (
  file_path: string,
  content: string,
  options?: IHostsWriteOptions,
): Promise<IWriteResult> => {
  // 检查写入模式
  // 如果 options 中指定了 write_mode，使用 options 中的值；否则使用配置中的值
  let write_mode = options?.write_mode || await configGet('write_mode')
  console.log(`write_mode: ${write_mode}, file_path: ${file_path}`)
  
  // 如果是追加模式，处理内容
  if (write_mode === 'append') {
    content = await makeAppendContent(file_path, content)
  }
  
  let result = await write(file_path, content, options)
  let { success, old_content } = result

  if (success) {
    if (typeof old_content === 'string') {
      let histories = await getHistoryList()
      // 检查是否需要保存旧内容到历史
      if (histories.length === 0 || histories[histories.length - 1].content !== old_content) {
        await addHistory(file_path, old_content)
      }
    }

    await addHistory(file_path, content)
    await updateTrayTitle()
    
    // 如果 options.silent 为 true，不触发 system_dotfile_updated 事件
    // 这在移除管理时很有用，因为我们已经清空了选中状态，不需要更新编辑器
    if (!options?.silent) {
      broadcast(events.system_dotfile_updated)
    }

    await tryToRun()
  }

  global.tracer.add(`w:${success ? 1 : 0}`)

  return result
}

export default setSystemDotfile

