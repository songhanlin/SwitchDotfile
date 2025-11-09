/**
 * refreshHosts
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { getDotfileContent, setDotfileContent, setList } from '@main/actions/index'
import { broadcast } from '@main/core/agent'

import { swhdb } from '@main/data'
import { GET } from '@main/libs/request'
import { IDotfileListObject, IOperationResult } from '@common/data'
import events from '@common/events'
import * as dotfileFn from '@common/dotfileFn'
import dayjs from 'dayjs'
import * as fs from 'fs'
import { URL } from 'url'

const refreshDotfile = async (dotfile_id: string): Promise<IOperationResult> => {
  let list = await swhdb.list.tree.all()
  let dotfile: IDotfileListObject | undefined = dotfileFn.findItemById(list, dotfile_id)

  if (!dotfile) {
    return {
      success: false,
      code: 'invalid_id',
    }
  }

  let { type, url } = dotfile

  if (type !== 'remote') {
    return {
      success: false,
      code: 'not_remote',
    }
  }

  if (!url) {
    return {
      success: false,
      code: 'no_url',
    }
  }

  let old_content: string = await getDotfileContent(dotfile.id)
  let new_content: string
  try {
    console.log(`-> refreshHosts URL: "${url}"`)
    if (url.startsWith('file://')) {
      new_content = await fs.promises.readFile(new URL(url), 'utf-8')
    } else {
      let resp = await GET(url)
      new_content = resp.data
    }
  } catch (e: any) {
    console.error(e)
    return {
      success: false,
      message: e.message,
    }
  }

  dotfile.last_refresh = dayjs().format('YYYY-MM-DD HH:mm:ss')
  dotfile.last_refresh_ms = new Date().getTime()

  await setList(list)

  if (old_content !== new_content) {
    await setDotfileContent(dotfile_id, new_content)
    broadcast(events.dotfile_refreshed, dotfile)
    broadcast(events.dotfile_content_changed, dotfile_id)
  }

  return {
    success: true,
    data: { ...dotfile },
  }
}

export default refreshDotfile
export { refreshDotfile }
