# SwitchDotfile

- [English](README.md)
- [繁體中文](README.zh_hant.md)

项目主页：[https://switchdotfile.vercel.app](https://switchdotfile.vercel.app)

SwitchDotfile 是一个管理 dot 文件的应用，基于 [Electron](http://electron.atom.io/)
、[React](https://facebook.github.io/react/)、[Jotai](https://jotai.org/)
、[Chakra UI](https://chakra-ui.com/)、[CodeMirror](http://codemirror.net/) 等技术开发。

## 截图

<img src="https://raw.githubusercontent.com/oldj/SwitchDotfile/master/screenshots/sh_light.png" alt="Capture" width="960">

## 功能特性

- 快速切换 dotfile 方案
- dotfile 语法高亮
- 支持从网络加载远程 dotfile 配置
- 可从系统菜单栏图标快速切换 dotfile

## 安装

### 下载

你可以下载源码并自行构建，也可以从以下地址下载已构建好的版本：

- [SwitchDotfile Download Page (GitHub release)](https://github.com/oldj/SwitchDotfile/releases)

你也可以通过 [Chocolatey 包管理器](https://community.chocolatey.org/packages/switchdotfile)安装已构建好的版本：
```powershell
choco install switchdotfile
```

## 数据备份

SwitchDotfile 的数据文件存储于 `~/.SwitchDotfile` (Windows 下存储于用户个人文件夹下的 `.SwitchDotfile` 文件夹），
其中 `~/.SwitchDotfile/data` 文件夹包含数据，`~/.SwitchDotfile/config` 文件夹包含各项配置信息。

## 开发以及构建

### 开发

- 安装 [Node.js](https://nodejs.org/)
- 在项目根目录 `./` 下，运行 `npm install` 命令安装依赖
- 运行 `npm run dev` 命令启动开发服务
- 运行 `npm run start` 启动 App，即可开始开发及调试

### 构建及打包

- 推荐使用 [electron-builder](https://github.com/electron-userland/electron-builder) 进行打包
- 转到项目根目录 './'
- 运行 `npm run build`
- 运行 `npm run make`，如果一切顺利，可在 `./dist` 目录下找到打包后的文件
- 首次运行可能需要花费一些时间，因为需要下载相关依赖文件。你也可以从 [这儿](https://github.com/electron/electron/releases)
  或者 [淘宝镜像](https://npmmirror.com/mirrors/electron/) 手动下载，并保存到 `~/.electron`
  目录下。更多信息可访问 [Electron 文档](http://electron.atom.io/docs/)。

```bash
# build
npm run build

# make
npm run make # the packed files will be in ./dist
```

## 版权

SwitchDotfile 是一个免费开源软件，基于 Apache-2.0 协议发布。
