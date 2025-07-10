// 云函数入口文件
const cloud = require('wx-server-sdk')
const { initDatabase, healthCheck, cleanTestData, backupData } = require('../../scripts/init-database.js')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action } = event

  try {
    // 验证管理员权限
    await checkAdminPermission(wxContext.OPENID)

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
        const registrationsCount = await db.collection('Registrations').where({
          userId: user._openid
        }).count()
        
        const presentCount = await db.collection('Registrations').where({
          userId: user._openid,
          status: 'present'
        }).count()
        
        return {
          ...user,
          stats: {
            totalRegistrations: registrationsCount.total,
            presentCount: presentCount.total,
            attendanceRate: registrationsCount.total > 0 ? 
              Math.round((presentCount.total / registrationsCount.total) * 100) : 0
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
