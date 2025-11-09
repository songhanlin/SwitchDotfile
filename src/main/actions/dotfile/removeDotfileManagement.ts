/**
 * 移除 dotfile 管理：删除 dotfile 文件夹，还原系统文件为默认配置
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { getList, setList, getDotfileContent, getSystemDotfile, setSystemDotfile } from '@main/actions'
import { IDotfileListObject } from '@common/data'
import { findItemById, deleteItemById, flatten } from '@common/dotfileFn'
import { broadcast } from '@main/core/agent'
import events from '@common/events'
import { swhdb } from '@main/data'

export default async (folder_id: string): Promise<{ success: boolean; message?: string }> => {
  console.log('开始移除 dotfile 管理:', folder_id)
  
  try {
    // 获取列表
    console.log('1. 获取列表...')
    let list = await getList()
    
    // 查找 dotfile 文件夹
    console.log('2. 查找文件夹...')
    const folder = findItemById(list, folder_id)
    if (!folder) {
      console.error('文件夹不存在:', folder_id)
      return { success: false, message: '文件夹不存在' }
    }
    
    // 只支持 system_file 类型
    if (folder.type !== 'system_file' || !folder.file_path) {
      console.error('不是 system_file 类型:', folder_id, '类型:', folder.type, 'file_path:', folder.file_path)
      return { success: false, message: '只有 system_file 类型才能移除管理' }
    }
    
    const file_path = folder.file_path
    const default_item_id = `${folder_id}-default`
    console.log('文件路径:', file_path)
    console.log('默认配置项 ID:', default_item_id)
    
    // 1. 读取系统文件的当前内容，移除我们管理的内容区域
    console.log('3. 读取系统文件内容...')
    let system_content = ''
    try {
      const current_content = await getSystemDotfile(file_path)
      console.log('当前文件内容长度:', current_content.length)
      
      // 移除我们管理的内容区域（CONTENT_START 和 CONTENT_END 之间的内容）
      const CONTENT_START = '# --- DOTFILE_MANAGER_CONTENT_START ---'
      const CONTENT_END = '# --- DOTFILE_MANAGER_CONTENT_END ---'
      const start_index = current_content.indexOf(CONTENT_START)
      const end_index = current_content.indexOf(CONTENT_END)
      
      if (start_index > -1 && end_index > -1 && end_index > start_index) {
        // 找到了我们管理的内容区域，提取系统原始内容（标记之前的内容）
        system_content = current_content.substring(0, start_index).trimEnd()
        console.log('找到管理区域，提取系统原始内容长度:', system_content.length)
      } else {
        // 没有找到标记，说明整个文件都是系统原始内容，或者文件没有被管理
        // 尝试从默认配置项读取，如果没有则使用当前文件内容
        try {
          system_content = await getDotfileContent(default_item_id)
          if (!system_content || system_content.trim() === '') {
            system_content = current_content.trimEnd()
            console.log('默认内容为空，使用当前文件内容')
          } else {
            console.log('使用默认配置项内容，长度:', system_content.length)
          }
        } catch (e: any) {
          console.warn('读取默认配置项失败，使用当前文件内容:', e.message)
          system_content = current_content.trimEnd()
        }
      }
      
      if (!system_content || system_content.trim() === '') {
        console.warn('系统内容为空，跳过文件还原')
      }
    } catch (e: any) {
      console.error('读取系统文件失败:', e.message || e)
      // 尝试从默认配置项读取
      try {
        system_content = await getDotfileContent(default_item_id)
        console.log('从默认配置项读取内容，长度:', system_content.length)
      } catch (e2: any) {
        console.error('读取默认内容也失败:', e2.message || e2)
        system_content = ''
      }
    }
    
    // 2. 先清空选中状态，避免编辑器在文件还原后加载内容
    console.log('4. 清空选中状态...')
    broadcast(events.select_dotfile, '')
    
    // 3. 将系统文件还原为默认配置（只写入系统原始内容，不包含管理标记）
    console.log('5. 还原系统文件...')
    let restore_success = false
    let restore_message = ''
    if (system_content) {
      try {
        // 直接写入系统原始内容，强制使用 overwrite 模式（通过 options 参数）
        // 因为我们只想写入系统原始内容，不需要追加
        // 使用 silent: true 避免触发 system_dotfile_updated 事件，因为我们已经在步骤2中清空了选中状态
        const result = await setSystemDotfile(file_path, system_content, { write_mode: 'overwrite', silent: true })
        console.log('还原结果:', result)
        if (result.success) {
          restore_success = true
          console.log('文件还原成功')
        } else {
          restore_success = false
          restore_message = result.message || result.code || '还原文件失败'
          console.error('文件还原失败:', restore_message, result)
          // 即使写入失败，也继续删除文件夹
        }
      } catch (e: any) {
        restore_success = false
        restore_message = e.message || '还原文件失败'
        console.error('文件还原异常:', e)
      }
    } else {
      restore_success = true
      restore_message = '没有系统内容需要还原'
      console.log('跳过文件还原（无系统内容）')
    }
    
    // 4. 从列表中删除该 dotfile 文件夹及其所有子项
    console.log('6. 从列表中删除文件夹...')
    const before_delete_count = list.length
    deleteItemById(list, folder_id)
    const after_delete_count = list.length
    console.log('删除前列表长度:', before_delete_count, '删除后列表长度:', after_delete_count)
    
    if (before_delete_count === after_delete_count) {
      console.warn('警告：文件夹可能没有被删除')
    }
    
    // 5. 删除数据库中该文件夹及其所有子项的内容
    console.log('7. 删除数据库内容...')
    const ids_to_delete = [folder_id]
    if (folder.children) {
      for (const child of folder.children) {
        ids_to_delete.push(child.id)
      }
    }
    console.log('要删除的 ID 列表:', ids_to_delete)
    
    try {
      await swhdb.collection.dotfile.delete((item) => ids_to_delete.includes(item.id))
      console.log('数据库内容删除成功')
    } catch (e: any) {
      console.error('删除数据库内容失败:', e.message || e)
      // 继续执行，不阻止删除操作
    }
    
    // 6. 保存更新后的列表
    console.log('8. 保存列表...')
    try {
      await setList(list)
      console.log('列表保存成功')
    } catch (e: any) {
      console.error('保存列表失败:', e)
      console.error('错误详情:', e.message, e.stack)
      // 尝试获取更详细的错误信息
      const error_msg = e.message || e.toString() || '未知错误'
      return { success: false, message: `保存列表失败: ${error_msg}` }
    }
    
    // 7. 刷新界面
    console.log('9. 刷新界面...')
    // 刷新列表数据（选中状态已经在步骤4中清空了）
    broadcast(events.reload_list)
    
    // 如果还原失败，返回警告信息，但不阻止删除操作
    if (!restore_success && restore_message) {
      console.log('操作完成，但有警告:', restore_message)
      return { 
        success: true, 
        message: `文件夹已删除，但系统文件还原失败: ${restore_message}。请手动检查文件。` 
      }
    }
    
    console.log('操作完成，成功')
    return { success: true }
  } catch (e: any) {
    console.error('移除 dotfile 管理失败:', e)
    console.error('错误堆栈:', e.stack)
    return { success: false, message: e.message || '未知错误' }
  }
}

