// scripts/init-database.js - 数据库初始化脚本
// 这个脚本可以在云函数中运行，用于初始化数据库

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

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
  const collections = ['Users', 'Events', 'Registrations', 'ErrorLogs', 'SecurityLogs']
  
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

// 导出函数
module.exports = {
  initDatabase,
  healthCheck,
  cleanTestData,
  backupData
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase().then(result => {
    console.log('初始化结果:', result)
  })
}
