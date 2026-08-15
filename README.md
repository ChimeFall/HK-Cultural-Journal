# 香港文化手账 (HK Cultural Journal)

课程项目。收录香港电影和音乐的取景地，可以在地图上找地点、实地打卡、记手账。

演示视频：https://www.bilibili.com/video/BV1sGbk6TEvr

## 功能

- 浏览电影/音乐作品，按区域、年份筛选，支持搜索
- 地图查看取景地分布，可按作品筛选、定位当前位置
- 走到收藏的取景地 100 米内会弹出打卡提醒（地理围栏）
- 打卡支持拍照和写笔记；记录有四种看法：时间线 / 按作品 / 地图足迹 / 成就徽章
- 收藏地点后，可以选几个点生成步行路线
- 打卡记录能生成分享海报
- 繁体 / 简体切换

## 技术

前端 React + Vite + Tailwind + Zustand，地图用高德 JS API；后端 FastAPI + SQLite。

有个坑要注意：数据库里存的是 WGS84 坐标，高德地图用的是 GCJ02，前后端转换用的是 gcoord 这个库，写新功能时别直接用原始坐标。

## 跑起来

需要 Node.js 18+ 和 Python 3.10+。

```bash
# 前端依赖
cd client && npm install

# 后端依赖
cd server && pip install -r requirements.txt
```

在 `client/.env.local` 里填高德地图的 key：

```
VITE_AMAP_KEY=你的key
VITE_AMAP_SECURITY_CONFIG=你的安全密钥
```

建库、导数据：

```bash
cd server/database
sqlite3 hk_journal.db < schema.sql
python import_data.py
```

启动（回到根目录）：

```bash
npm run dev   # 前后端一起起，后端 3001，前端 5173
```

## 说明

- 仓库里只有代码。取景地原始数据（`data/`）、数据库文件和上传的图片都没有传上来。
- 用户标识用的是设备 ID（localStorage 里的随机字符串），不用注册登录。
