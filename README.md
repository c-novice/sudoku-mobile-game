# 数独练习

一个纯静态的手机数独小游戏项目，无需构建，直接部署即可打开游玩。

## 项目特点

- 适配手机竖屏界面
- 支持数字输入、候选笔记、撤销、重做、提示、删除
- 自动保存当前进度
- 支持 PWA 安装到手机桌面
- 部署后可离线打开

## 本地打开

直接双击 `index.html` 可以预览。

如果你要在手机上打开，建议启动一个局域网静态服务：

```bash
cd /Users/lzq/AI/pvz-game
python3 -m http.server 4173
```

然后让手机和电脑连接同一个 Wi-Fi，在手机浏览器访问：

```text
http://你的电脑局域网IP:4173
```

例如：

```text
http://192.168.1.23:4173
```

## 部署

这个项目可以直接部署到任意静态托管：

- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages
- 任意 Nginx 静态站点

上传整个 `/Users/lzq/AI/pvz-game` 目录即可。

## 文件结构

- `index.html`：页面结构
- `style.css`：界面样式
- `game.js`：游戏逻辑
- `manifest.webmanifest`：手机安装配置
- `sw.js`：离线缓存
- `icon.svg`：应用图标
