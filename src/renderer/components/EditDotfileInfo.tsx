/**
 * EditDotfileInfo
 * @author: oldj
 * @homepage: https://oldj.net
 */

import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  HStack,
  Input,
  Radio,
  RadioGroup,
  Select,
  Stack,
  useToast,
} from '@chakra-ui/react'
import ItemIcon from '@renderer/components/ItemIcon'
import Transfer from '@renderer/components/Transfer'
import { actions, agent } from '@renderer/core/agent'
import useOnBroadcast from '@renderer/core/useOnBroadcast'
import { FolderModeType, DotfileType, IDotfileListObject } from '@common/data'
import events from '@common/events'
import * as dotfileFn from '@common/dotfileFn'
import lodash from 'lodash'
import React, { useRef, useState } from 'react'
import { BiEdit, BiTrash } from 'react-icons/bi'
import { v4 as uuidv4 } from 'uuid'
import useDotfileData from '@renderer/models/useDotfileData'
import useI18n from '../models/useI18n'
import styles from './EditDotfileInfo.module.scss'

const EditDotfileInfo = () => {
  const { lang } = useI18n()
  const [dotfile, setDotfile] = useState<IDotfileListObject | null>(null)
  const { dotfile_data, setList, current_dotfile, setCurrentDotfile } = useDotfileData()
  const [is_show, setIsShow] = useState(false)
  const [is_add, setIsAdd] = useState(true)
  const [is_refreshing, setIsRefreshing] = useState(false)
  const ipt_title_ref = useRef<HTMLInputElement>(null)

  const toast = useToast()

  const onCancel = () => {
    setDotfile(null)
    setIsShow(false)
  }

  const onSave = async () => {
    let data: Omit<IDotfileListObject, 'id'> & { id?: string } = { ...dotfile }

    const keys_to_trim = ['title', 'url', 'file_path']
    keys_to_trim.map((k) => {
      if (data[k]) {
        data[k] = data[k].trim()
      }
    })

    if (is_add) {
      // add
      let h: IDotfileListObject = {
        ...data,
        id: uuidv4(),
      }
      
      // 如果指定了父文件夹，添加到父文件夹的 children 中
      const parent_id = (data as any)._parent_id
      if (parent_id) {
        const parent = dotfileFn.findItemById(dotfile_data.list, parent_id)
        // 父文件夹必须是 system_file 或 folder 类型
        if (parent && (parent.type === 'system_file' || parent.type === 'folder')) {
          if (!parent.children) {
            parent.children = []
          }
          // 如果添加的是 folder 类型且指定了 file_path，需要创建默认配置项
          if (h.type === 'folder' && h.file_path) {
            const default_item_id = `${h.id}-default`
            const default_item: IDotfileListObject = {
              id: default_item_id,
              title: lang.system_default_config,
              type: 'local',
              on: true,
            }
            if (!h.children) {
              h.children = []
            }
            h.children.unshift(default_item)
          }
          parent.children.push(h)
          await setList([...dotfile_data.list])
        } else {
          // 父文件夹不存在或不是 system_file/folder 类型，添加到顶层
          // 但只有 system_file 类型可以添加到顶层
          if (h.type !== 'system_file') {
            toast({
              status: 'error',
              description: '只能在系统文件或文件夹类型下添加配置项。',
              isClosable: true,
            })
            return
          }
          let list: IDotfileListObject[] = [...dotfile_data.list, h]
          await setList(list)
        }
      } else {
        // 没有指定父文件夹，添加到顶层（只允许添加 system_file 类型）
        if (h.type !== 'system_file') {
          toast({
            status: 'error',
            description: '根目录只能添加系统文件类型。',
            isClosable: true,
          })
          return
        }
        // system_file 类型必须填写文件路径
        if (!h.file_path || !h.file_path.trim()) {
          toast({
            status: 'error',
            description: '系统文件类型必须填写文件路径。',
            isClosable: true,
          })
          return
        }
        // 如果是 system_file 类型且指定了 file_path，需要创建默认配置项（不读取系统文件）
        if (h.type === 'system_file' && h.file_path) {
          // 创建空的默认配置项
          const default_item_id = `${h.id}-default`
          const default_item: IDotfileListObject = {
            id: default_item_id,
            title: lang.system_default_config,
            type: 'local',
            on: true, // 默认开启
          }
          
          // 将默认配置项添加到 system_file 的 children 中
          if (!h.children) {
            h.children = []
          }
          h.children.unshift(default_item) // 添加到开头
        }
        let list: IDotfileListObject[] = [...dotfile_data.list, h]
        await setList(list)
      }
      
      agent.broadcast(events.select_dotfile, h.id, 1000)
    } else if (data && data.id) {
      // edit
      // system_file 类型必须填写文件路径
      if (data.type === 'system_file' && (!data.file_path || !data.file_path.trim())) {
        toast({
          status: 'error',
          description: '系统文件类型必须填写文件路径。',
          isClosable: true,
        })
        return
      }
      
      let h: IDotfileListObject | undefined = dotfileFn.findItemById(dotfile_data.list, data.id)
      if (h) {
        Object.assign(h, data)
        await setList([...dotfile_data.list])

        if (data.id === current_dotfile?.id) {
          setCurrentDotfile(h)
        }
      } else {
        // can not find by id
        setIsAdd(true)
        setTimeout(onSave, 300)
        return
      }
    } else {
      // unknown error
      alert('unknown error!')
    }

    setIsShow(false)
  }

  const onUpdate = (kv: Partial<IDotfileListObject>) => {
    // 如果当前 dotfile 有 _parent_id，说明是在文件夹内添加，默认类型应该是 local
    const default_type = (dotfile as any)?._parent_id ? 'local' : (dotfile?.type || 'system_file')
    let obj: IDotfileListObject = Object.assign({}, dotfile || { type: default_type, id: '' } as IDotfileListObject, kv) as IDotfileListObject
    setDotfile(obj)
  }

  useOnBroadcast(events.edit_dotfile_info, (dotfile_param?: IDotfileListObject) => {
    console.log('=== 编辑项目信息 ===')
    console.log('模式: 编辑')
    console.log('项目数据:', dotfile_param)
    console.log('类型 (type):', dotfile_param?.type)
    console.log('ID:', dotfile_param?.id)
    console.log('==================')
    setDotfile(dotfile_param || null)
    setIsAdd(!dotfile_param)
    setIsShow(true)
  })

  useOnBroadcast(events.add_new, () => {
    console.log('=== 添加新项目 ===')
    console.log('模式: 添加（根目录）')
    console.log('默认类型: system_file')
    console.log('当前选中的 dotfile:', current_dotfile)
    console.log('==================')
    
    // 检查当前是否选中了系统文件或文件夹
    // 如果选中了系统文件或文件夹，应该在其内添加配置项
    if (current_dotfile && (current_dotfile.type === 'folder' || current_dotfile.type === 'system_file')) {
      console.log('检测到当前选中了系统文件或文件夹，将在其内添加配置项')
      const temp_dotfile: any = { 
        type: 'local', 
        id: '', 
        _parent_id: current_dotfile.id,
        title: ''
      }
      setDotfile(temp_dotfile)
    } else {
      // 默认创建系统文件类型
      setDotfile({ type: 'system_file' } as IDotfileListObject)
    }
    setIsAdd(true)
    setIsShow(true)
  })

  useOnBroadcast(events.add_new_in_folder, (parent_id: string) => {
    console.log('=== 在文件夹内添加新项目 ===')
    console.log('模式: 添加（文件夹内）')
    console.log('父文件夹 ID:', parent_id)
    console.log('默认类型: local')
    console.log('==================')
    // 在指定文件夹下添加配置项
    setIsAdd(true)
    setIsShow(true)
    // 保存父文件夹 ID，在保存时使用
    // 注意：使用一个临时的 id，确保对象被正确创建
    const temp_dotfile: any = { 
      type: 'local', 
      id: '', 
      _parent_id: parent_id,
      title: ''
    }
    setDotfile(temp_dotfile)
  })

  useOnBroadcast(
    events.dotfile_refreshed,
    (_dotfile: IDotfileListObject) => {
      if (dotfile && dotfile.id === _dotfile.id) {
        onUpdate(lodash.pick(_dotfile, ['last_refresh', 'last_refresh_ms']))
      }
    },
    [dotfile],
  )

  const forRemote = (): React.ReactElement => {
    return (
      <>
        <FormControl className={styles.ln}>
          <FormLabel>URL</FormLabel>
          <Input
            value={dotfile?.url || ''}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder={lang.url_placeholder}
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
          />
        </FormControl>

        <FormControl className={styles.ln}>
          <FormLabel>{lang.auto_refresh}</FormLabel>
          <div>
            <Select
              value={dotfile?.refresh_interval || 0}
              onChange={(e) => onUpdate({ refresh_interval: parseInt(e.target.value) || 0 })}
              style={{ minWidth: 120 }}
            >
              <option value={0}>{lang.never}</option>
              <option value={60}>1 {lang.minute}</option>
              <option value={60 * 5}>5 {lang.minutes}</option>
              <option value={60 * 15}>15 {lang.minutes}</option>
              <option value={60 * 60}>1 {lang.hour}</option>
              <option value={60 * 60 * 24}>24 {lang.hours}</option>
              <option value={60 * 60 * 24 * 7}>7 {lang.days}</option>
            </Select>
          </div>
          {is_add ? null : (
            <FormHelperText className={styles.refresh_info}>
              <span>
                {lang.last_refresh}
                {dotfile?.last_refresh || 'N/A'}
              </span>
              <Button
                size="small"
                variant="ghost"
                disabled={is_refreshing}
                onClick={() => {
                  if (!dotfile) return

                  setIsRefreshing(true)
                  actions
                    .refreshDotfile(dotfile.id)
                    .then((r) => {
                      console.log(r)
                      if (!r.success) {
                        toast({
                          status: 'error',
                          description: r.message || r.code || 'Error!',
                          isClosable: true,
                        })
                        return
                      }

                      toast({
                        status: 'success',
                        description: 'OK!',
                        isClosable: true,
                      })
                      onUpdate({
                        last_refresh: r.data.last_refresh,
                        last_refresh_ms: r.data.last_refresh_ms,
                      })
                    })
                    .catch((e) => {
                      console.log(e)
                      toast({
                        status: 'error',
                        description: e.message,
                        isClosable: true,
                      })
                    })
                    .finally(() => setIsRefreshing(false))
                }}
              >
                {lang.refresh}
              </Button>
            </FormHelperText>
          )}
        </FormControl>
      </>
    )
  }

  const renderTransferItem = (item: IDotfileListObject): React.ReactElement => {
    return (
      <HStack>
        <ItemIcon type={item.type} />
        <span style={{ marginLeft: 4 }}>{item.title || lang.untitled}</span>
      </HStack>
    )
  }

  const forGroup = (): React.ReactElement => {
    const list = dotfileFn.flatten(dotfile_data.list)

    let source_list: IDotfileListObject[] = list
      .filter((item) => !item.type || item.type === 'local' || item.type === 'remote')
      .map((item) => {
        let o = { ...item }
        o.key = o.id
        return o
      })

    let target_keys: string[] = dotfile?.include || []

    return (
      <FormControl className={styles.ln}>
        <FormLabel>{lang.content}</FormLabel>
        <Transfer
          dataSource={source_list}
          targetKeys={target_keys}
          render={renderTransferItem}
          onChange={(next_target_keys) => {
            onUpdate({ include: next_target_keys })
          }}
        />
      </FormControl>
    )
  }

  const forFolder = (): React.ReactElement => {
    return (
      <FormControl className={styles.ln}>
        <FormLabel>{lang.choice_mode}</FormLabel>
        <RadioGroup
          value={(dotfile?.folder_mode || 0).toString()}
          onChange={(v: string) => onUpdate({ folder_mode: (parseInt(v) || 0) as FolderModeType })}
        >
          <HStack spacing={3}>
            <Radio value="0">{lang.choice_mode_default}</Radio>
            <Radio value="1">{lang.choice_mode_single}</Radio>
            <Radio value="2">{lang.choice_mode_multiple}</Radio>
          </HStack>
        </RadioGroup>
      </FormControl>
    )
  }

  const forSystemFile = (): React.ReactElement => {
    // system_file 类型和 folder 类型使用相同的表单
    return forFolder()
  }

  const types: DotfileType[] = ['local', 'remote', 'group', 'folder', 'system_file']

  const footer_buttons = (
    <Grid templateColumns="1fr 1fr" style={{ width: '100%' }}>
      <Box>
        {is_add ? null : (
          <Button
            leftIcon={<BiTrash />}
            mr={3}
            variant="outline"
            disabled={!dotfile}
            colorScheme="pink"
            onClick={() => {
              if (dotfile) {
                agent.broadcast(events.move_to_trashcan, [dotfile.id])
                onCancel()
              }
            }}
          >
            {lang.move_to_trashcan}
          </Button>
        )}
      </Box>
      <Box style={{ textAlign: 'right' }}>
        <Button onClick={onCancel} variant="outline" mr={3}>
          {lang.btn_cancel}
        </Button>
        <Button onClick={onSave} colorScheme="blue">
          {lang.btn_ok}
        </Button>
      </Box>
    </Grid>
  )

  return (
    <Drawer initialFocusRef={ipt_title_ref} isOpen={is_show} onClose={onCancel} size="lg">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerHeader>
          <HStack>
            <Box mr={1}>
              <BiEdit />
            </Box>
            <Box>{is_add ? lang.dotfile_add : lang.dotfile_edit}</Box>
          </HStack>
        </DrawerHeader>
        <DrawerBody pb={6}>
          <FormControl className={styles.ln}>
            <FormLabel>{lang.dotfile_type}</FormLabel>
            {(() => {
              // 在渲染时打印当前状态
              const is_in_folder = !!(dotfile as any)?._parent_id
              const is_root_level = is_add && !is_in_folder
              console.log('=== 类型选择组件渲染 ===')
              console.log('is_add:', is_add)
              console.log('is_in_folder:', is_in_folder)
              console.log('is_root_level:', is_root_level)
              console.log('dotfile:', dotfile)
              console.log('_parent_id:', (dotfile as any)?._parent_id)
              console.log('当前类型:', dotfile?.type)
              console.log('==================')
              return null
            })()}
            <RadioGroup
              onChange={(type: DotfileType) => {
                console.log('=== 类型选择变更 ===')
                console.log('新类型:', type)
                console.log('当前 dotfile:', dotfile)
                console.log('是否有父文件夹 (_parent_id):', (dotfile as any)?._parent_id)
                console.log('==================')
                onUpdate({ type: type })
              }}
              value={dotfile?.type || ((dotfile as any)?._parent_id ? 'local' : 'system_file')}
            >
              <Stack direction="row" spacing={6}>
                {types.map((type) => {
                  // 判断是否在文件夹内添加
                  const is_in_folder = !!(dotfile as any)?._parent_id
                  // 判断是否是根目录添加
                  const is_root_level = is_add && !is_in_folder
                  
                  // 获取父文件夹类型
                  let parent_type: DotfileType | undefined
                  if (is_in_folder && (dotfile as any)?._parent_id) {
                    const parent = dotfileFn.findItemById(dotfile_data.list, (dotfile as any)._parent_id)
                    parent_type = parent?.type
                  }
                  
                  // 根目录：只显示 system_file 类型
                  // system_file 内：显示 local、remote、group、folder（不显示 system_file）
                  // folder 内：显示 local、remote、group（不显示 system_file 和 folder）
                  let show_type = false
                  if (is_root_level) {
                    // 根目录只能添加 system_file
                    show_type = type === 'system_file'
                  } else if (is_in_folder) {
                    if (parent_type === 'system_file') {
                      // system_file 内可以添加 local、remote、group、folder，但不能添加 system_file
                      show_type = type !== 'system_file'
                    } else if (parent_type === 'folder') {
                      // folder 内可以添加 local、remote、group，但不能添加 system_file 和 folder
                      show_type = type !== 'system_file' && type !== 'folder'
                    } else {
                      // 其他情况：不显示 system_file
                      show_type = type !== 'system_file'
                    }
                  } else {
                    // 编辑模式：显示所有类型
                    show_type = true
                  }
                  
                  console.log(`类型 ${type}: is_in_folder=${is_in_folder}, is_root_level=${is_root_level}, parent_type=${parent_type}, show_type=${show_type}, _parent_id=${(dotfile as any)?._parent_id}`)
                  
                  return show_type ? (
                    <Radio value={type} key={type} isDisabled={!is_add}>
                      <HStack spacing="4px">
                        <ItemIcon type={type} />
                        <span>{lang[type]}</span>
                      </HStack>
                    </Radio>
                  ) : null
                })}
              </Stack>
            </RadioGroup>
            {is_add && !(dotfile as any)?._parent_id && (
              <FormHelperText>
                根目录只能添加系统文件类型。添加系统文件后，可以在系统文件下添加配置项（local、remote、group、folder）。
              </FormHelperText>
            )}
          </FormControl>

          <FormControl className={styles.ln}>
            <FormLabel>{lang.dotfile_title}</FormLabel>
            <Input
              ref={ipt_title_ref}
              value={dotfile?.title || ''}
              maxLength={50}
              onChange={(e) => onUpdate({ title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && onSave()}
            />
          </FormControl>

          {dotfile?.type === 'folder' || dotfile?.type === 'system_file' ? (
            <>
              <FormControl className={styles.ln} isRequired={dotfile?.type === 'system_file'}>
                <FormLabel>文件路径</FormLabel>
                <Input
                  value={dotfile?.file_path || ''}
                  onChange={(e) => onUpdate({ file_path: e.target.value })}
                  placeholder="例如: ~/.zshrc, ~/.gitconfig, /etc/hosts"
                  onKeyDown={(e) => e.key === 'Enter' && onSave()}
                  isRequired={dotfile?.type === 'system_file'}
                />
                <FormHelperText>
                  输入 dotfile 的文件路径，支持 ~ 表示用户主目录。{dotfile?.type === 'system_file' ? '系统文件类型必须填写文件路径。' : '此文件夹下的所有配置项将写入此文件。'}
                </FormHelperText>
              </FormControl>
              {dotfile?.type === 'system_file' ? forSystemFile() : forFolder()}
            </>
          ) : null}
          {dotfile?.type === 'local' ? (
            <>
              {/* 如果有父文件夹，说明会添加到父文件夹的文件中 */}
              {(dotfile as any)?._parent_id ? (
                <FormControl className={styles.ln}>
                  <FormLabel>说明</FormLabel>
                  <FormHelperText>
                    此配置项将添加到父文件夹指定的文件中。如果父文件夹是 dotfile 路径，此配置项的内容将合并到该文件。
                  </FormHelperText>
                </FormControl>
              ) : (
                /* 如果没有父文件夹，可以指定文件路径（独立配置） */
                <FormControl className={styles.ln}>
                  <FormLabel>文件路径（可选）</FormLabel>
                  <Input
                    value={dotfile?.file_path || ''}
                    onChange={(e) => onUpdate({ file_path: e.target.value })}
                    placeholder="例如: ~/.zshrc, ~/.gitconfig（留空则仅作为配置片段）"
                    onKeyDown={(e) => e.key === 'Enter' && onSave()}
                  />
                  <FormHelperText>
                    如果指定了文件路径，此配置项将直接写入该文件。如果不指定，则仅作为配置片段，需要添加到有文件路径的文件夹下。
                  </FormHelperText>
                </FormControl>
              )}
            </>
          ) : null}
          {dotfile?.type === 'remote' ? forRemote() : null}
          {dotfile?.type === 'group' ? forGroup() : null}
        </DrawerBody>

        <DrawerFooter>{footer_buttons}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export default EditDotfileInfo
