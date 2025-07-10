# 性能优化指南

## 📊 性能优化策略

### 1. 代码层面优化

#### 1.1 云函数优化
```javascript
// ✅ 推荐：使用连接池和缓存
const db = cloud.database()
const _ = db.command

// 批量操作而非循环调用
const batchUpdate = async (updates) => {
  const batch = db.batch()
  updates.forEach(update => {
    batch.update(update.collection, update.doc, update.data)
  })
  return await batch.commit()
}

// ❌ 避免：在循环中调用数据库
for (let item of items) {
  await db.collection('test').add({ data: item })
}
```

#### 1.2 数据库查询优化
```javascript
// ✅ 推荐：使用索引和限制查询
const events = await db.collection('Events')
  .where({
    status: 'registering',
    eventTime: _.gte(new Date())
  })
  .orderBy('eventTime', 'asc')
  .limit(20)
  .get()

// ✅ 推荐：只查询需要的字段
const events = await db.collection('Events')
  .field({
    title: true,
    eventTime: true,
    location: true,
    status: true
  })
  .get()
```

#### 1.3 前端性能优化
```javascript
// ✅ 推荐：使用防抖和节流
const { debounce, throttle } = require('./utils/common.js')

// 搜索输入防抖
const debouncedSearch = debounce(this.searchEvents, 300)

// 滚动事件节流
const throttledScroll = throttle(this.onScroll, 100)
```

### 2. 数据缓存策略

#### 2.1 本地缓存
```javascript
// 使用数据管理器进行缓存
const { eventDataManager } = require('./services/dataManager.js')

// 优先从缓存获取数据
let eventList = eventDataManager.getEventList()
if (!eventList.length) {
  eventList = await eventService.getEventList()
  eventDataManager.setEventList(eventList)
}
```

#### 2.2 云端缓存
```javascript
// 在云函数中使用缓存
const cache = new Map()

exports.main = async (event, context) => {
  const cacheKey = `events_${event.status}`
  
  // 检查缓存
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)
    if (Date.now() - cached.timestamp < 300000) { // 5分钟缓存
      return cached.data
    }
  }
  
  // 查询数据库
  const result = await db.collection('Events').where({
    status: event.status
  }).get()
  
  // 设置缓存
  cache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  })
  
  return result
}
```

### 3. 图片和资源优化

#### 3.1 图片优化
```javascript
// 使用云存储的图片处理功能
const optimizedImageUrl = `${originalUrl}?imageMogr2/thumbnail/300x300/quality/80`

// 懒加载图片
<image 
  src="{{item.imageUrl}}" 
  lazy-load="{{true}}"
  mode="aspectFill"
/>
```

#### 3.2 资源预加载
```javascript
// 在app.js中预加载关键资源
onLaunch() {
  // 预加载关键页面
  wx.preloadPage({
    url: '/pages/event-list/event-list'
  })
  
  // 预连接云服务
  wx.cloud.init()
}
```

### 4. 网络请求优化

#### 4.1 请求合并
```javascript
// ✅ 推荐：合并多个请求
const loadPageData = async () => {
  const [events, userStatus, registrations] = await Promise.all([
    eventService.getEventList(),
    registrationService.getUserEventStatus(eventId),
    registrationService.getMyRegistrations()
  ])
  
  return { events, userStatus, registrations }
}
```

#### 4.2 请求重试机制
```javascript
const retryRequest = async (requestFn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

### 5. 页面渲染优化

#### 5.1 虚拟列表
```javascript
// 对于长列表使用虚拟滚动
<scroll-view 
  scroll-y="{{true}}"
  bindscrolltolower="loadMore"
  enable-back-to-top="{{true}}"
>
  <view wx:for="{{visibleItems}}" wx:key="id">
    <!-- 列表项内容 -->
  </view>
</scroll-view>
```

#### 5.2 条件渲染优化
```javascript
// ✅ 推荐：使用wx:if进行条件渲染
<view wx:if="{{showContent}}">
  <!-- 复杂内容 -->
</view>

// ❌ 避免：使用hidden隐藏复杂内容
<view hidden="{{!showContent}}">
  <!-- 复杂内容仍会渲染 -->
</view>
```

### 6. 内存管理

#### 6.1 及时清理
```javascript
// 页面卸载时清理数据
onUnload() {
  // 清理定时器
  if (this.timer) {
    clearInterval(this.timer)
  }
  
  // 清理事件监听
  wx.offNetworkStatusChange()
  
  // 清理大对象
  this.setData({
    largeDataList: null
  })
}
```

#### 6.2 避免内存泄漏
```javascript
// ✅ 推荐：使用WeakMap避免循环引用
const weakMap = new WeakMap()

// ✅ 推荐：及时移除事件监听
const handleNetworkChange = (res) => {
  // 处理网络变化
}

onLoad() {
  wx.onNetworkStatusChange(handleNetworkChange)
}

onUnload() {
  wx.offNetworkStatusChange(handleNetworkChange)
}
```

## 📈 性能监控

### 1. 关键指标监控
```javascript
// 页面加载时间监控
const startTime = Date.now()

onLoad() {
  this.loadData().then(() => {
    const loadTime = Date.now() - startTime
    logger.info('Performance', `页面加载耗时: ${loadTime}ms`)
  })
}
```

### 2. 错误监控
```javascript
// 全局错误监控
App({
  onError(error) {
    logger.error('App', '小程序错误', error)
    
    // 上报错误信息
    wx.cloud.callFunction({
      name: 'error_reporter',
      data: {
        error: error.toString(),
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    })
  }
})
```

### 3. 用户体验监控
```javascript
// 用户操作响应时间
const trackUserAction = (action, startTime) => {
  const responseTime = Date.now() - startTime
  
  if (responseTime > 1000) {
    logger.warn('Performance', `${action} 响应时间过长: ${responseTime}ms`)
  }
}
```

## 🎯 性能优化检查清单

### 代码优化
- [ ] 云函数使用连接池和批量操作
- [ ] 数据库查询添加索引和限制
- [ ] 前端使用防抖节流优化用户交互
- [ ] 避免在循环中进行异步操作

### 缓存策略
- [ ] 实现本地数据缓存
- [ ] 云函数添加内存缓存
- [ ] 合理设置缓存过期时间
- [ ] 缓存失效时的降级策略

### 网络优化
- [ ] 合并多个网络请求
- [ ] 实现请求重试机制
- [ ] 使用请求去重避免重复调用
- [ ] 网络异常时的友好提示

### 渲染优化
- [ ] 长列表使用虚拟滚动
- [ ] 合理使用条件渲染
- [ ] 图片懒加载和压缩
- [ ] 避免频繁的setData操作

### 内存管理
- [ ] 页面卸载时清理资源
- [ ] 避免内存泄漏
- [ ] 大数据对象及时释放
- [ ] 合理使用全局变量

### 监控告警
- [ ] 关键性能指标监控
- [ ] 错误信息收集和上报
- [ ] 用户体验数据统计
- [ ] 性能瓶颈分析和优化

## 📱 小程序特定优化

### 1. 包体积优化
```javascript
// 使用分包加载
// app.json
{
  "subpackages": [
    {
      "root": "pages/admin",
      "pages": [
        "create-event/create-event"
      ]
    }
  ]
}
```

### 2. 启动优化
```javascript
// 预加载关键数据
onLaunch() {
  // 预加载用户信息
  this.checkLoginStatus()
  
  // 预连接云服务
  wx.cloud.init()
  
  // 预加载关键页面
  wx.preloadPage({
    url: '/pages/event-list/event-list'
  })
}
```

### 3. 体验优化
```javascript
// 使用骨架屏
<view class="skeleton" wx:if="{{loading}}">
  <!-- 骨架屏内容 -->
</view>

// 优化加载状态
<loading show="{{loading}}" text="加载中..." type="spinner" />
```

通过以上优化策略，可以显著提升小程序的性能和用户体验。建议在开发过程中逐步实施这些优化措施，并持续监控性能指标。
