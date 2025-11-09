/**
 * @author: oldj
 * @homepage: https://oldj.net
 */

import * as path from 'path'
import { homedir } from 'os'

export function getDefaultDataDir() {
  return path.join(homedir(), '.SwitchDotfile')
}

export default (): string => {
  // todo data folder should be current working dir for portable version

  return global.data_dir || getDefaultDataDir()
}
