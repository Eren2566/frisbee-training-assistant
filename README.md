# 飞盘队训练助手小程序

## 项目概述

这是一个基于微信原生小程序 + 微信云开发的飞盘队训练管理工具，主要功能包括训练创建、报名管理、出勤统计等。

## 技术架构

- **前端**: 微信原生小程序 (WXML + WXSS + JavaScript)
- **后端**: 微信云开发 (云函数 + 云数据库 + 云存储)
- **数据库**: MongoDB 文档数据库

## 项目结构

```
Frisbee/
├── docs/                           # 项目文档
│   ├── 小程序架构设计与开发文档.md
│   └── 开发计划.md
├── pages/                          # 小程序页面
│   ├── index/                      # 首页
│   ├── login/                      # 登录页
│   ├── event-list/                 # 训练列表页
│   ├── event-detail/               # 训练详情页
│   ├── my-profile/                 # 个人中心页
│   └── admin/
│       └── create-event/           # 创建训练页（管理员）
├── cloudfunctions/                 # 云函数
│   ├── user_service/               # 用户服务
│   ├── event_service/              # 训练活动服务
│   └── registration_service/       # 报名注册服务
├── images/                         # 图片资源
├── app.js                          # 小程序入口文件
├── app.json                        # 小程序配置文件
├── app.wxss                        # 全局样式文件
├── project.config.json             # 项目配置文件
└── sitemap.json                    # 站点地图配置
```

## 当前开发状态

### ✅ 已完成
1. **项目基础架构搭建**
   - 小程序项目结构创建
   - 云函数基础框架搭建
   - 页面路由配置

2. **核心页面开发**
   - 首页 (index)
   - 登录页 (login)
   - 训练列表页 (event-list)
   - 训练详情页 (event-detail)
   - 个人中心页 (my-profile)
   - 创建训练页 (admin/create-event)

3. **云函数开发**
   - user_service: 用户登录注册
   - event_service: 训练活动管理
   - registration_service: 报名出勤管理

### 🔄 待完成
1. **环境配置**
   - 微信小程序 AppID 配置
   - 云开发环境 ID 配置
   - 数据库集合创建
   - 云函数部署

2. **图标资源**
   - TabBar 图标文件
   - 页面装饰图标

3. **测试验证**
   - 功能测试
   - 权限验证
   - 数据流测试

## 部署步骤

### 1. 环境准备
1. 在微信公众平台注册小程序，获取 AppID
2. 在微信开发者工具中开通云开发，获取环境 ID

### 2. 配置修改
1. 修改 `project.config.json` 中的 `appid` 字段
2. 修改 `app.js` 中的云开发环境 ID

### 3. 数据库初始化
在云开发控制台创建以下集合：
- `Users` - 用户信息表
- `Events` - 训练活动表  
- `Registrations` - 报名出勤表

### 4. 云函数部署
在微信开发者工具中，右键每个云函数目录选择"上传并部署"

### 5. 图标资源
在 `images/` 目录下添加以下图标文件：
- `home.png` / `home-active.png` - 首页图标
- `event.png` / `event-active.png` - 训练图标
- `profile.png` / `profile-active.png` - 个人中心图标

## 核心功能

### 队员端功能
- 查看训练安排
- 在线报名/请假
- 查看个人出勤记录
- 出勤统计展示

### 队长端功能
- 创建训练活动
- 管理报名情况
- 现场确认出勤
- 查看团队统计

## 数据库设计

### Users 集合
```javascript
{
  _openid: String,      // 用户唯一标识
  nickName: String,     // 用户昵称
  avatarUrl: String,    // 头像URL
  role: String,         // 角色: 'admin' | 'member'
  createTime: Date      // 创建时间
}
```

### Events 集合
```javascript
{
  _id: String,          // 活动ID
  creatorId: String,    // 创建者openid
  title: String,        // 训练主题
  eventTime: Date,      // 训练时间
  location: String,     // 训练地点
  content: String,      // 训练内容
  notes: String,        // 备注信息
  status: String,       // 状态: 'registering' | 'finished'
  createTime: Date,     // 创建时间
  updateTime: Date      // 更新时间
}
```

### Registrations 集合
```javascript
{
  _id: String,          // 报名记录ID
  eventId: String,      // 关联活动ID
  userId: String,       // 用户openid
  status: String,       // 状态: 'signed_up' | 'leave_requested' | 'present' | 'absent'
  createTime: Date,     // 创建时间
  updateTime: Date      // 更新时间
}
```

## 开发注意事项

1. **权限控制**: 管理员功能需要验证用户角色
2. **数据安全**: 云函数中需要验证用户身份
3. **用户体验**: 添加加载状态和错误提示
4. **性能优化**: 合理使用缓存和分页加载

## 联系方式

如有问题，请联系开发团队。
