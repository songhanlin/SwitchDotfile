/**
 * 获取系统 dotfile 的内容（从实际文件读取）
 * @author: oldj
 * @homepage: https://oldj.net
 */

import getDotfilePath from './getDotfilePath'
import { promises as fs } from 'fs'

export default async (file_path: string): Promise<string> => {
  const abs_path = getDotfilePath(file_path)
  
  try {
    const content = await fs.readFile(abs_path, 'utf-8')
    return content
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      // 文件不存在，返回空字符串
      return ''
    }
    throw e
  }
}
