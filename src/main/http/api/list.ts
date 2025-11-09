/**
 * list
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { getList } from '@main/actions'
import { IDotfileListObject } from '@common/data'
import { flatten } from '@common/dotfileFn'
import { Request, Response } from 'express'

const list = async (req: Request, res: Response) => {
  let list: IDotfileListObject[]
  try {
    list = await getList()
  } catch (e: any) {
    res.end(
      JSON.stringify({
        success: false,
        message: e.message,
      }),
    )

    return
  }

  list = flatten(list)

  res.end(
    JSON.stringify({
      success: true,
      data: list,
    }),
  )
}

export default list
