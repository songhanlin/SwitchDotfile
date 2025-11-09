/**
 * 获取 dotfile 的绝对路径
 * @author: oldj
 * @homepage: https://oldj.net
 */

import * as os from 'os'
import * as path from 'path'

export default (file_path: string): string => {
  // 如果路径以 ~ 开头，替换为用户主目录
  if (file_path.startsWith('~')) {
    return path.join(os.homedir(), file_path.slice(1))
  }
  
  // 如果是相对路径，也转换为绝对路径
  if (!path.isAbsolute(file_path)) {
    return path.resolve(file_path)
  }
  
  return file_path
}

