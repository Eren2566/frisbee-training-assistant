# 安全指南

## 🔒 安全策略概述

本项目采用多层安全防护策略，确保用户数据和系统安全。

## 🛡️ 身份认证与授权

### 1. 用户身份验证
```javascript
// 云函数中获取用户身份
const wxContext = cloud.getWXContext()
const openid = wxContext.OPENID

// 验证用户是否存在
const userResult = await db.collection('Users').where({
  _openid: openid
}).get()

if (userResult.data.length === 0) {
  return {
    success: false,
    message: '用户不存在'
  }
}
```

### 2. 权限控制
```javascript
// 管理员权限验证
const checkAdminPermission = async (openid) => {
  const userResult = await db.collection('Users').where({
    _openid: openid
  }).get()
  
  if (userResult.data.length === 0 || userResult.data[0].role !== 'admin') {
    throw new Error('权限不足')
  }
  
  return userResult.data[0]
}

// 在需要管理员权限的操作中使用
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    await checkAdminPermission(wxContext.OPENID)
    // 执行管理员操作
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}
```

### 3. 资源访问控制
```javascript
// 确保用户只能访问自己的数据
const getUserRegistrations = async (openid) => {
  return await db.collection('Registrations').where({
    userId: openid
  }).get()
}

// 防止越权访问
const updateRegistration = async (registrationId, openid, updateData) => {
  // 先验证记录是否属于当前用户
  const registration = await db.collection('Registrations').doc(registrationId).get()
  
  if (!registration.data || registration.data.userId !== openid) {
    throw new Error('无权限修改此记录')
  }
  
  return await db.collection('Registrations').doc(registrationId).update({
    data: updateData
  })
}
```

## 🔐 数据安全

### 1. 数据库安全规则
```javascript
// 数据库安全规则示例
{
  "read": "auth.openid != null", // 只有登录用户可读
  "write": "auth.openid == resource.userId || get(`database.Users.${auth.openid}`).role == 'admin'"
}
```

### 2. 敏感数据处理
```javascript
// ❌ 避免：在前端存储敏感信息
// 不要在本地存储中保存密码、token等敏感信息

// ✅ 推荐：敏感操作在云函数中处理
const processPayment = async (orderData) => {
  // 支付逻辑在云函数中处理，不暴露给前端
  const paymentResult = await thirdPartyPaymentAPI(orderData)
  return paymentResult
}
```

### 3. 数据验证
```javascript
// 输入数据验证
const validateEventData = (eventData) => {
  const errors = []
  
  if (!eventData.title || eventData.title.length < 2 || eventData.title.length > 50) {
    errors.push('训练标题长度必须在2-50字符之间')
  }
  
  if (!eventData.eventTime || new Date(eventData.eventTime) <= new Date()) {
    errors.push('训练时间必须是未来时间')
  }
  
  if (!eventData.location || eventData.location.length > 100) {
    errors.push('训练地点不能为空且不超过100字符')
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join('; '))
  }
}

// 在云函数中使用
exports.main = async (event, context) => {
  try {
    validateEventData(event)
    // 处理业务逻辑
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}
```

## 🚫 防护措施

### 1. SQL注入防护
```javascript
// ✅ 推荐：使用参数化查询
const getEventsByStatus = async (status) => {
  return await db.collection('Events').where({
    status: status // 使用参数，而非字符串拼接
  }).get()
}

// ❌ 避免：字符串拼接查询（虽然云数据库相对安全，但仍需注意）
```

### 2. XSS防护
```javascript
// 前端数据显示时进行转义
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

// 在显示用户输入内容时使用
<text>{{escapeHtml(userInput)}}</text>
```

### 3. CSRF防护
```javascript
// 云函数中验证请求来源
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  // 验证请求来源
  if (!wxContext.SOURCE || wxContext.SOURCE !== 'wx_client') {
    return {
      success: false,
      message: '非法请求来源'
    }
  }
  
  // 处理业务逻辑
}
```

### 4. 频率限制
```javascript
// 简单的频率限制实现
const rateLimitMap = new Map()

const checkRateLimit = (openid, action, limit = 10, window = 60000) => {
  const key = `${openid}_${action}`
  const now = Date.now()
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + window })
    return true
  }
  
  const record = rateLimitMap.get(key)
  
  if (now > record.resetTime) {
    record.count = 1
    record.resetTime = now + window
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  return true
}

// 在云函数中使用
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  if (!checkRateLimit(wxContext.OPENID, 'create_event', 5, 300000)) {
    return {
      success: false,
      message: '操作过于频繁，请稍后再试'
    }
  }
  
  // 处理业务逻辑
}
```

## 📊 安全监控

### 1. 异常行为检测
```javascript
// 检测异常登录行为
const detectAbnormalLogin = async (openid, loginInfo) => {
  const recentLogins = await db.collection('LoginLogs').where({
    openid: openid
  }).orderBy('loginTime', 'desc').limit(10).get()
  
  // 检测异常模式
  const suspiciousPatterns = [
    // 短时间内多次登录
    recentLogins.data.filter(log => 
      Date.now() - log.loginTime.getTime() < 300000
    ).length > 5,
    
    // 异常时间登录（如凌晨）
    new Date().getHours() < 6 || new Date().getHours() > 23
  ]
  
  if (suspiciousPatterns.some(pattern => pattern)) {
    // 记录可疑行为
    await db.collection('SecurityLogs').add({
      data: {
        openid: openid,
        type: 'suspicious_login',
        details: loginInfo,
        timestamp: new Date()
      }
    })
  }
}
```

### 2. 错误日志监控
```javascript
// 安全相关错误监控
const logSecurityEvent = async (eventType, details) => {
  await db.collection('SecurityLogs').add({
    data: {
      type: eventType,
      details: details,
      timestamp: new Date(),
      severity: getSeverityLevel(eventType)
    }
  })
  
  // 高危事件立即告警
  if (getSeverityLevel(eventType) === 'high') {
    await sendAlert(eventType, details)
  }
}

const getSeverityLevel = (eventType) => {
  const highRiskEvents = ['unauthorized_access', 'data_breach', 'admin_privilege_abuse']
  const mediumRiskEvents = ['failed_login_attempts', 'suspicious_activity']
  
  if (highRiskEvents.includes(eventType)) return 'high'
  if (mediumRiskEvents.includes(eventType)) return 'medium'
  return 'low'
}
```

## 🔧 安全配置

### 1. 云开发安全设置
```javascript
// 云函数环境变量配置
const config = {
  // 加密密钥（存储在环境变量中）
  ENCRYPT_KEY: process.env.ENCRYPT_KEY,
  
  // API密钥
  API_SECRET: process.env.API_SECRET,
  
  // 安全模式
  SECURITY_MODE: process.env.NODE_ENV === 'production' ? 'strict' : 'normal'
}
```

### 2. 数据加密
```javascript
const crypto = require('crypto')

// 敏感数据加密
const encryptData = (data, key) => {
  const cipher = crypto.createCipher('aes192', key)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

// 数据解密
const decryptData = (encryptedData, key) => {
  const decipher = crypto.createDecipher('aes192', key)
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

## ✅ 安全检查清单

### 身份认证
- [ ] 所有云函数都验证用户身份
- [ ] 管理员操作需要权限验证
- [ ] 用户只能访问自己的数据
- [ ] 实现会话超时机制

### 数据保护
- [ ] 敏感数据加密存储
- [ ] 输入数据严格验证
- [ ] 输出数据适当转义
- [ ] 数据库访问权限最小化

### 攻击防护
- [ ] 防止SQL注入攻击
- [ ] 防止XSS攻击
- [ ] 防止CSRF攻击
- [ ] 实现频率限制

### 监控告警
- [ ] 异常行为检测
- [ ] 安全事件日志记录
- [ ] 错误信息监控
- [ ] 定期安全审计

### 配置安全
- [ ] 生产环境安全配置
- [ ] 敏感信息环境变量化
- [ ] 定期更新依赖包
- [ ] 代码安全审查

## 🚨 应急响应

### 1. 安全事件处理流程
1. **发现阶段**：监控系统发现异常
2. **评估阶段**：评估安全事件影响范围
3. **响应阶段**：采取应急措施
4. **恢复阶段**：系统功能恢复
5. **总结阶段**：事件分析和改进

### 2. 常见安全事件处理
```javascript
// 账户异常处理
const handleAccountAnomaly = async (openid, anomalyType) => {
  switch (anomalyType) {
    case 'multiple_failed_logins':
      // 临时锁定账户
      await lockAccount(openid, 300000) // 5分钟
      break
      
    case 'suspicious_activity':
      // 要求重新验证身份
      await requireReauth(openid)
      break
      
    case 'data_breach_suspected':
      // 立即禁用账户并通知
      await disableAccount(openid)
      await notifyUser(openid, 'security_alert')
      break
  }
}
```

通过实施以上安全措施，可以有效保护小程序和用户数据的安全。建议定期进行安全审计和漏洞扫描，持续改进安全防护能力。
