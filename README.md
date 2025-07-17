# 🥏 飞盘队训练助手小程序

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-微信小程序-green.svg)
![Framework](https://img.shields.io/badge/framework-云开发-orange.svg)
![License](https://img.shields.io/badge/license-MIT-red.svg)

**专业的飞盘队训练管理工具**

基于微信原生小程序 + 云开发的完整解决方案

[快速开始](#-快速部署) · [功能特性](#-功能特性) · [技术架构](#-技术架构) · [文档](#-文档)

</div>

## 📖 项目概述

这是一个**生产就绪的商业级小程序应用**，专为飞盘队训练管理而设计。采用微信云开发的Serverless架构，提供完整的训练管理、报名系统、出勤统计等功能。

## ✨ 功能特性

### 🔐 用户管理
- 微信登录授权
- 角色权限控制（管理员/队员）
- 用户信息管理

### 🏃‍♂️ 训练管理
- 训练活动创建（管理员）
- 训练列表展示
- 训练详情查看
- 训练状态管理

### 📝 报名系统
- 在线报名功能
- 请假申请
- 报名状态跟踪
- 重复报名防护

### 📊 出勤管理
- 现场出勤确认
- 出勤状态更新
- 个人出勤记录
- 出勤统计分析

### 📈 数据统计
- 个人出勤统计
- 团队整体分析
- 训练活动统计
- 数据可视化展示

## 🏗️ 技术架构

### 核心技术栈
- **前端**: 微信原生小程序 (WXML + WXSS + JavaScript)
- **后端**: 微信云开发 (云函数 + 云数据库)
- **数据库**: MongoDB 文档数据库
- **架构**: Serverless 云原生设计

### 项目规模
```
📱 9个功能页面 + ☁️ 6个云函数 + 🧩 3个组件 + 🛠️ 完整工具链
```

## 项目结构

```
Frisbee/
├── docs/                           # 项目文档
│   ├── 小程序架构设计与开发文档.md    # 技术架构设计
│   └── 开发计划.md                  # 开发计划（已完成）
├── pages/                          # 小程序页面
│   ├── index/                      # 首页 - 训练动态展示
│   ├── login/                      # 登录页 - 微信授权登录
│   ├── user-info/                  # 用户信息完善页
│   ├── event-list/                 # 训练列表页
│   ├── event-detail/               # 训练详情页
│   ├── my-profile/                 # 个人中心页
│   ├── admin/create-event/         # 创建训练页（管理员）
│   ├── deploy-check/               # 部署检查页（开发工具）
│   └── dev-tools/                  # 开发工具页
├── cloudfunctions/                 # 云函数服务
│   ├── user_service/               # 用户认证和管理
│   ├── event_service/              # 训练活动管理
│   ├── registration_service/       # 报名出勤管理
│   ├── analytics_service/          # 数据统计分析
│   ├── system_service/             # 系统管理维护
│   └── error_reporter/             # 错误监控上报
├── components/                     # 可复用组件
│   ├── loading/                    # 加载状态组件
│   ├── empty-state/                # 空状态展示组件
│   └── status-badge/               # 状态徽章组件
├── services/                       # 业务服务层
│   ├── api.js                      # API服务封装
│   └── dataManager.js              # 数据状态管理
├── utils/                          # 工具函数
│   ├── common.js                   # 通用工具函数
│   ├── logger.js                   # 日志记录系统
│   └── userUtils.js                # 用户相关工具
├── config/                         # 配置管理
│   └── index.js                    # 统一配置文件
├── scripts/                        # 部署和维护脚本
├── images/                         # 图片资源
├── app.js                          # 小程序入口文件
├── app.json                        # 小程序配置文件
├── app.wxss                        # 全局样式文件
├── project.config.json             # 项目配置文件
└── sitemap.json                    # 站点地图配置
```

## 🚀 快速部署

### 前置要求
- 微信开发者工具
- 微信小程序账号
- 5分钟时间

### 一键部署
```bash
# 1. 克隆项目
git clone https://github.com/您的用户名/frisbee-training-assistant.git

# 2. 配置AppID和环境ID
# 修改 project.config.json 和 app.js 中的配置

# 3. 部署云函数和数据库
# 在微信开发者工具中一键部署

# 4. 开始使用！
```

详细部署指南请查看 [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)

## 📚 文档

| 文档 | 描述 |
|------|------|
| [快速部署](./QUICK_DEPLOY.md) | 5分钟快速上线指南 |
| [详细部署](./DEPLOYMENT.md) | 完整的部署文档 |
| [性能优化](./PERFORMANCE.md) | 性能优化指南 |
| [安全指南](./SECURITY.md) | 安全防护措施 |
| [架构设计](./docs/小程序架构设计与开发文档.md) | 技术架构设计文档 |

## 🎯 项目亮点

### 💼 商业价值
- ✅ **生产就绪** - 企业级代码质量
- ✅ **零运维成本** - Serverless架构
- ✅ **快速部署** - 5分钟上线
- ✅ **完整功能** - 覆盖训练管理全流程

### 🔧 技术特色
- ✅ **现代架构** - 云原生设计
- ✅ **高质量代码** - 模块化、可扩展
- ✅ **完善文档** - 从部署到维护
- ✅ **安全可靠** - 多层安全防护

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
在微信开发者工具中，右键每个云函数目录选择"上传并部署"：
- `user_service` - 用户认证和管理
- `event_service` - 训练活动管理
- `registration_service` - 报名出勤管理
- `analytics_service` - 数据统计分析
- `system_service` - 系统管理维护
- `error_reporter` - 错误监控上报

### 5. 图标资源
TabBar图标已包含在 `images/` 目录下：
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
