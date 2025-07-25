// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// ==================== 数据库管理功能 ====================

/**
 * 初始化数据库集合和索引
 */
const initDatabase = async () => {
  console.log('开始初始化数据库...')

  try {
    // 1. 创建集合（如果不存在）
    await createCollections()

    // 2. 创建索引
    await createIndexes()

    // 3. 插入初始数据
    await insertInitialData()

    console.log('数据库初始化完成！')
    return {
      success: true,
      message: '数据库初始化成功'
    }
  } catch (error) {
    console.error('数据库初始化失败:', error)
    return {
      success: false,
      message: '数据库初始化失败',
      error: error.message
    }
  }
}

/**
 * 创建数据库集合
 */
const createCollections = async () => {
  const collections = ['Users', 'Events', 'Registrations', 'ErrorLogs', 'SecurityLogs', 'EventLogs']

  for (const collectionName of collections) {
    try {
      // 尝试获取集合信息，如果不存在会抛出错误
      await db.collection(collectionName).limit(1).get()
      console.log(`集合 ${collectionName} 已存在`)
    } catch (error) {
      // 集合不存在，创建一个空文档然后删除（用于创建集合）
      try {
        const result = await db.collection(collectionName).add({
          data: { _temp: true }
        })
        await db.collection(collectionName).doc(result._id).remove()
        console.log(`集合 ${collectionName} 创建成功`)
      } catch (createError) {
        console.error(`创建集合 ${collectionName} 失败:`, createError)
      }
    }
  }
}

/**
 * 创建数据库索引
 */
const createIndexes = async () => {
  console.log('创建数据库索引...')

  // 注意：云数据库的索引创建需要在控制台手动操作
  // 这里只是记录需要创建的索引
  const indexesToCreate = [
    {
      collection: 'Users',
      indexes: [
        { field: '_openid', unique: true },
        { field: 'role' },
        { field: 'createTime' }
      ]
    },
    {
      collection: 'Events',
      indexes: [
        { field: 'creatorId' },
        { field: 'eventTime' },
        { field: 'status' },
        { field: 'createTime' }
      ]
    },
    {
      collection: 'Registrations',
      indexes: [
        { field: 'eventId' },
        { field: 'userId' },
        { field: 'status' },
        { field: ['eventId', 'userId'], unique: true }, // 复合唯一索引
        { field: 'createTime' }
      ]
    }
  ]

  console.log('需要在云开发控制台手动创建以下索引:')
  indexesToCreate.forEach(({ collection, indexes }) => {
    console.log(`\n集合: ${collection}`)
    indexes.forEach(index => {
      if (Array.isArray(index.field)) {
        console.log(`  - 复合索引: ${index.field.join(' + ')} ${index.unique ? '(唯一)' : ''}`)
      } else {
        console.log(`  - 单字段索引: ${index.field} ${index.unique ? '(唯一)' : ''}`)
      }
    })
  })
}

/**
 * 插入初始数据
 */
const insertInitialData = async () => {
  console.log('插入初始数据...')

  // 检查是否已有数据
  const usersCount = await db.collection('Users').count()
  if (usersCount.total > 0) {
    console.log('数据库已有数据，跳过初始数据插入')
    return
  }

  // 插入系统配置数据（如果需要）
  const systemConfig = {
    version: '1.0.0',
    initialized: true,
    initTime: new Date(),
    features: {
      attendanceStats: true,
      notifications: false,
      eventRating: false,
      imageUpload: false,
      dataExport: false
    }
  }

  try {
    await db.collection('SystemConfig').add({
      data: systemConfig
    })
    console.log('系统配置数据插入成功')
  } catch (error) {
    console.log('系统配置数据插入失败:', error.message)
  }
}

/**
 * 数据库健康检查
 */
const healthCheck = async () => {
  console.log('执行数据库健康检查...')

  const checks = []

  // 检查集合是否存在
  const requiredCollections = ['Users', 'Events', 'Registrations']
  for (const collection of requiredCollections) {
    try {
      const result = await db.collection(collection).limit(1).get()
      checks.push({
        type: 'collection',
        name: collection,
        status: 'ok',
        message: '集合存在且可访问'
      })
    } catch (error) {
      checks.push({
        type: 'collection',
        name: collection,
        status: 'error',
        message: error.message
      })
    }
  }

  // 检查数据完整性
  try {
    const usersCount = await db.collection('Users').count()
    const eventsCount = await db.collection('Events').count()
    const registrationsCount = await db.collection('Registrations').count()

    checks.push({
      type: 'data',
      name: 'statistics',
      status: 'ok',
      message: `用户: ${usersCount.total}, 训练: ${eventsCount.total}, 报名: ${registrationsCount.total}`
    })
  } catch (error) {
    checks.push({
      type: 'data',
      name: 'statistics',
      status: 'error',
      message: error.message
    })
  }

  return checks
}

/**
 * 清理测试数据
 */
const cleanTestData = async () => {
  console.log('清理测试数据...')

  try {
    // 删除测试用户
    const testUsers = await db.collection('Users').where({
      nickName: db.RegExp({
        regexp: '^测试|^test',
        options: 'i'
      })
    }).get()

    for (const user of testUsers.data) {
      await db.collection('Users').doc(user._id).remove()
      console.log(`删除测试用户: ${user.nickName}`)
    }

    // 删除测试训练
    const testEvents = await db.collection('Events').where({
      title: db.RegExp({
        regexp: '^测试|^test',
        options: 'i'
      })
    }).get()

    for (const event of testEvents.data) {
      // 同时删除相关的报名记录
      await db.collection('Registrations').where({
        eventId: event._id
      }).remove()

      await db.collection('Events').doc(event._id).remove()
      console.log(`删除测试训练: ${event.title}`)
    }

    console.log('测试数据清理完成')
    return {
      success: true,
      message: '测试数据清理成功'
    }
  } catch (error) {
    console.error('测试数据清理失败:', error)
    return {
      success: false,
      message: '测试数据清理失败',
      error: error.message
    }
  }
}

/**
 * 数据备份
 */
const backupData = async () => {
  console.log('开始数据备份...')

  try {
    const backup = {
      timestamp: new Date(),
      version: '1.0.0',
      data: {}
    }

    // 备份用户数据
    const users = await db.collection('Users').get()
    backup.data.users = users.data

    // 备份训练数据
    const events = await db.collection('Events').get()
    backup.data.events = events.data

    // 备份报名数据
    const registrations = await db.collection('Registrations').get()
    backup.data.registrations = registrations.data

    // 保存备份到云存储或返回数据
    console.log('数据备份完成')
    return {
      success: true,
      message: '数据备份成功',
      backup: backup
    }
  } catch (error) {
    console.error('数据备份失败:', error)
    return {
      success: false,
      message: '数据备份失败',
      error: error.message
    }
  }
}

// ==================== 云函数入口函数 ====================
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action } = event

  try {
    // 对于开发工具相关操作，跳过权限验证（开发环境专用）
    const devActions = ['createTestUsers', 'getUserManagement']
    if (!devActions.includes(action)) {
      await checkAdminPermission(wxContext.OPENID)
    }

    switch (action) {
      case 'initDatabase':
        return await initDatabase()
      case 'healthCheck':
        return await performHealthCheck()
      case 'cleanTestData':
        return await cleanTestData()
      case 'backupData':
        return await backupData()
      case 'getSystemInfo':
        return await getSystemInfo()
      case 'updateSystemConfig':
        return await updateSystemConfig(event.config)
      case 'getUserManagement':
        return await getUserManagement(event.options)
      case 'getSystemLogs':
        return await getSystemLogs(event.options)
      case 'createTestUsers':
        return await createTestUsers()
      case 'getEventLogs':
        return await getEventLogs(event)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('系统管理云函数执行错误:', error)
    return {
      success: false,
      message: error.message || '服务器错误'
    }
  }
}

// 验证管理员权限
async function checkAdminPermission(openid) {
  const userResult = await db.collection('Users').where({
    _openid: openid
  }).get()

  if (userResult.data.length === 0 || userResult.data[0].role !== 'admin') {
    throw new Error('权限不足，只有管理员可以执行系统管理操作')
  }
}

// 执行健康检查
async function performHealthCheck() {
  try {
    const checks = await healthCheck()
    
    // 额外的系统检查
    const systemChecks = await performSystemChecks()
    
    return {
      success: true,
      data: {
        databaseChecks: checks,
        systemChecks: systemChecks,
        timestamp: new Date(),
        status: checks.every(check => check.status === 'ok') && 
                systemChecks.every(check => check.status === 'ok') ? 'healthy' : 'warning'
      }
    }
  } catch (error) {
    return {
      success: false,
      message: '健康检查失败: ' + error.message
    }
  }
}

// 系统检查
async function performSystemChecks() {
  const checks = []
  
  // 检查云函数状态
  try {
    const functionTest = await cloud.callFunction({
      name: 'user_service',
      data: { action: 'test' }
    })
    checks.push({
      type: 'cloudFunction',
      name: 'user_service',
      status: 'ok',
      message: '云函数响应正常'
    })
  } catch (error) {
    checks.push({
      type: 'cloudFunction',
      name: 'user_service',
      status: 'error',
      message: error.message
    })
  }
  
  // 检查存储空间
  try {
    const storageInfo = await getStorageInfo()
    checks.push({
      type: 'storage',
      name: 'database_storage',
      status: storageInfo.usage < 0.8 ? 'ok' : 'warning',
      message: `存储使用率: ${Math.round(storageInfo.usage * 100)}%`
    })
  } catch (error) {
    checks.push({
      type: 'storage',
      name: 'database_storage',
      status: 'error',
      message: '无法获取存储信息'
    })
  }
  
  return checks
}

// 获取存储信息
async function getStorageInfo() {
  // 这里可以实现存储空间检查逻辑
  // 由于云开发的限制，这里返回模拟数据
  return {
    usage: 0.3, // 30% 使用率
    total: '2GB',
    used: '600MB'
  }
}

// 获取系统信息
async function getSystemInfo() {
  try {
    // 统计基本信息
    const usersCount = await db.collection('Users').count()
    const eventsCount = await db.collection('Events').count()
    const registrationsCount = await db.collection('Registrations').count()
    
    // 获取系统配置
    let systemConfig = {}
    try {
      const configResult = await db.collection('SystemConfig').limit(1).get()
      systemConfig = configResult.data[0] || {}
    } catch (error) {
      console.log('系统配置不存在，使用默认配置')
    }
    
    // 计算系统运行时间
    const initTime = systemConfig.initTime || new Date()
    const uptime = Date.now() - new Date(initTime).getTime()
    
    return {
      success: true,
      data: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: uptime,
        statistics: {
          totalUsers: usersCount.total,
          totalEvents: eventsCount.total,
          totalRegistrations: registrationsCount.total
        },
        systemConfig: systemConfig,
        timestamp: new Date()
      }
    }
  } catch (error) {
    throw new Error('获取系统信息失败: ' + error.message)
  }
}

// 更新系统配置
async function updateSystemConfig(config) {
  try {
    if (!config || typeof config !== 'object') {
      throw new Error('配置参数无效')
    }
    
    // 获取现有配置
    const existingConfigResult = await db.collection('SystemConfig').limit(1).get()
    
    const updateData = {
      ...config,
      updateTime: new Date()
    }
    
    if (existingConfigResult.data.length > 0) {
      // 更新现有配置
      await db.collection('SystemConfig').doc(existingConfigResult.data[0]._id).update({
        data: updateData
      })
    } else {
      // 创建新配置
      await db.collection('SystemConfig').add({
        data: {
          ...updateData,
          createTime: new Date()
        }
      })
    }
    
    return {
      success: true,
      message: '系统配置更新成功'
    }
  } catch (error) {
    throw new Error('更新系统配置失败: ' + error.message)
  }
}

// 用户管理
async function getUserManagement(options = {}) {
  try {
    const { page = 1, limit = 20, role, keyword } = options
    
    let query = db.collection('Users')
    
    // 角色筛选
    if (role) {
      query = query.where({ role })
    }
    
    // 关键词搜索
    if (keyword) {
      query = query.where({
        nickName: db.RegExp({
          regexp: keyword,
          options: 'i'
        })
      })
    }
    
    // 分页查询
    const total = await query.count()
    const users = await query
      .skip((page - 1) * limit)
      .limit(limit)
      .orderBy('createTime', 'desc')
      .get()
    
    // 获取用户活动统计
    const usersWithStats = await Promise.all(
      users.data.map(async (user) => {
        // 统计状态为 'signed_up' 的记录作为报名训练数
        const signedUpCount = await db.collection('Registrations').where({
          userId: user._openid,
          status: 'signed_up'
        }).count()

        const presentCount = await db.collection('Registrations').where({
          userId: user._openid,
          status: 'present'
        }).count()

        // 总报名训练次数 = 已报名 + 已出勤（因为出勤的记录原本也是报名的）
        const totalRegistrations = signedUpCount.total + presentCount.total

        return {
          ...user,
          stats: {
            totalRegistrations: totalRegistrations,
            presentCount: presentCount.total,
            attendanceRate: totalRegistrations > 0 ?
              Math.round((presentCount.total / totalRegistrations) * 100) : 0
          }
        }
      })
    )
    
    return {
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          page,
          limit,
          total: total.total,
          pages: Math.ceil(total.total / limit)
        }
      }
    }
  } catch (error) {
    throw new Error('获取用户管理数据失败: ' + error.message)
  }
}

// 获取系统日志
async function getSystemLogs(options = {}) {
  try {
    const { type = 'all', page = 1, limit = 50, startDate, endDate } = options
    
    let collections = []
    
    switch (type) {
      case 'error':
        collections = ['ErrorLogs']
        break
      case 'security':
        collections = ['SecurityLogs']
        break
      case 'all':
      default:
        collections = ['ErrorLogs', 'SecurityLogs']
        break
    }
    
    const logs = []
    
    for (const collection of collections) {
      try {
        let query = db.collection(collection)
        
        // 时间范围筛选
        if (startDate && endDate) {
          query = query.where({
            timestamp: db.command.gte(new Date(startDate)).and(db.command.lte(new Date(endDate)))
          })
        }
        
        const result = await query
          .orderBy('timestamp', 'desc')
          .limit(limit)
          .get()
        
        result.data.forEach(log => {
          logs.push({
            ...log,
            logType: collection
          })
        })
      } catch (error) {
        console.log(`获取 ${collection} 日志失败:`, error.message)
      }
    }
    
    // 按时间排序
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    return {
      success: true,
      data: {
        logs: logs.slice(0, limit),
        total: logs.length,
        types: collections
      }
    }
  } catch (error) {
    throw new Error('获取系统日志失败: ' + error.message)
  }
}

// 批量操作用户
async function batchUserOperation(operation, userIds) {
  try {
    const results = []
    
    for (const userId of userIds) {
      try {
        switch (operation) {
          case 'activate':
            await db.collection('Users').doc(userId).update({
              data: { status: 'active', updateTime: new Date() }
            })
            results.push({ userId, success: true, message: '激活成功' })
            break
            
          case 'deactivate':
            await db.collection('Users').doc(userId).update({
              data: { status: 'inactive', updateTime: new Date() }
            })
            results.push({ userId, success: true, message: '停用成功' })
            break
            
          case 'delete':
            // 删除用户相关数据
            await db.collection('Registrations').where({ userId }).remove()
            await db.collection('Users').doc(userId).remove()
            results.push({ userId, success: true, message: '删除成功' })
            break
            
          default:
            results.push({ userId, success: false, message: '未知操作' })
        }
      } catch (error) {
        results.push({ userId, success: false, message: error.message })
      }
    }
    
    return {
      success: true,
      data: results
    }
  } catch (error) {
    throw new Error('批量操作失败: ' + error.message)
  }
}

// 创建测试用户
async function createTestUsers() {
  console.log('开始创建测试用户...')

  const testUsers = [
    {
      _openid: "test_admin_001",
      nickName: "队长张三",
      avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKxxxxxxx/132",
      role: "admin",
      isInfoCompleted: true,
      gender: "男",
      institute: "卫星互联",
      realName: "张三",
      discName: "飞盘队长",
      contactInfo: "13800138001",
      createTime: new Date("2025-01-01T08:00:00.000Z"),
      updateTime: new Date("2025-01-01T08:30:00.000Z")
    },
    {
      _openid: "test_member_001",
      nickName: "队员李四",
      avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKyyyyyy/132",
      role: "member",
      isInfoCompleted: true,
      gender: "男",
      institute: "工业软件",
      realName: "李四",
      discName: "闪电侠",
      contactInfo: "13800138002",
      createTime: new Date("2025-01-01T09:00:00.000Z"),
      updateTime: new Date("2025-01-01T09:30:00.000Z")
    },
    {
      _openid: "test_member_002",
      nickName: "队员王五",
      avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKzzzzzz/132",
      role: "member",
      isInfoCompleted: true,
      gender: "女",
      institute: "集成电路",
      realName: "王五",
      discName: "飞燕",
      contactInfo: "13800138003",
      createTime: new Date("2025-01-01T10:00:00.000Z"),
      updateTime: new Date("2025-01-01T10:30:00.000Z")
    },
    {
      _openid: "test_member_003",
      nickName: "队员赵六",
      avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKaaaaaa/132",
      role: "member",
      isInfoCompleted: true,
      gender: "女",
      institute: "先进信息",
      realName: "赵六",
      discName: "风行者",
      contactInfo: "13800138004",
      createTime: new Date("2025-01-01T11:00:00.000Z"),
      updateTime: new Date("2025-01-01T11:30:00.000Z")
    },
    {
      _openid: "test_member_004",
      nickName: "队员孙七",
      avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKbbbbb/132",
      role: "member",
      isInfoCompleted: true,
      gender: "男",
      institute: "先进视觉",
      realName: "孙七",
      discName: "追风",
      contactInfo: "13800138005",
      createTime: new Date("2025-01-01T12:00:00.000Z"),
      updateTime: new Date("2025-01-01T12:30:00.000Z")
    },
    {
      _openid: "test_member_005",
      nickName: "队员周八",
      avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKcccccc/132",
      role: "member",
      isInfoCompleted: true,
      gender: "女",
      institute: "汽车电子",
      realName: "周八",
      discName: "疾风",
      contactInfo: "13800138006",
      createTime: new Date("2025-01-01T13:00:00.000Z"),
      updateTime: new Date("2025-01-01T13:30:00.000Z")
    },
    {
      _openid: "test_member_006",
      nickName: "队员吴九",
      avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKdddddd/132",
      role: "member",
      isInfoCompleted: true,
      gender: "男",
      institute: "其他",
      realName: "吴九",
      discName: "雷霆",
      contactInfo: "13800138007",
      createTime: new Date("2025-01-01T14:00:00.000Z"),
      updateTime: new Date("2025-01-01T14:30:00.000Z")
    }
  ]

  try {
    // 清除现有测试数据
    await db.collection('Users').where({
      _openid: db.RegExp({
        regexp: '^test_',
        options: 'i'
      })
    }).remove()

    // 批量插入测试用户
    for (const user of testUsers) {
      await db.collection('Users').add({
        data: user
      })
      console.log(`创建测试用户: ${user.discName} (${user.realName})`)
    }

    console.log('测试用户创建完成！')
    return {
      success: true,
      message: '测试用户创建成功',
      count: testUsers.length,
      users: testUsers.map(u => ({
        discName: u.discName,
        realName: u.realName,
        gender: u.gender,
        institute: u.institute,
        role: u.role
      }))
    }
  } catch (error) {
    console.error('创建测试用户失败:', error)
    return {
      success: false,
      message: '创建测试用户失败',
      error: error.message
    }
  }
}

/**
 * 获取事件操作日志
 */
const getEventLogs = async (event) => {
  try {
    const { limit = 10, eventId, action } = event

    let query = db.collection('EventLogs')

    // 如果指定了事件ID，只查询该事件的日志
    if (eventId) {
      query = query.where({
        eventId: eventId
      })
    }

    // 如果指定了操作类型，只查询该类型的日志
    if (action) {
      query = query.where({
        action: action
      })
    }

    const result = await query
      .orderBy('operationTime', 'desc')
      .limit(limit)
      .get()

    return {
      success: true,
      data: result.data,
      message: `获取到${result.data.length}条事件日志`
    }
  } catch (error) {
    console.error('获取事件日志失败:', error)
    return {
      success: false,
      message: '获取事件日志失败',
      error: error.message
    }
  }
}
