// 数据库迁移脚本：为用户添加盘名修改限制相关字段
// 运行方式：在微信开发者工具的云开发控制台中执行

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

async function migrateDiscNameFields() {
  try {
    console.log('开始迁移用户盘名修改字段...')
    
    // 获取所有用户
    const users = await db.collection('Users').get()
    console.log(`找到 ${users.data.length} 个用户需要迁移`)
    
    let successCount = 0
    let errorCount = 0
    let skipCount = 0
    
    // 批量更新用户字段
    for (const user of users.data) {
      try {
        // 检查用户是否已有新字段
        if (user.discNameChangeCount === undefined) {
          // 初始化盘名修改历史
          const initialHistory = []
          
          // 如果用户已有盘名，记录为初始设置
          if (user.discName) {
            initialHistory.push({
              oldName: '',
              newName: user.discName,
              changeTime: user.createTime || new Date(),
              changeReason: '初始设置'
            })
          }

          await db.collection('Users').doc(user._id).update({
            data: {
              discNameChangeCount: initialHistory.length,     // 如果有初始盘名则为1，否则为0
              discNameChangeHistory: initialHistory,          // 修改历史记录
              lastDiscNameChangeTime: initialHistory.length > 0 ? (user.createTime || new Date()) : null
            }
          })
          
          successCount++
          console.log(`用户 ${user.nickName || user._openid} 迁移成功 (初始修改次数: ${initialHistory.length})`)
        } else {
          skipCount++
          console.log(`用户 ${user.nickName || user._openid} 已存在盘名字段，跳过`)
        }
      } catch (error) {
        errorCount++
        console.error(`用户 ${user.nickName || user._openid} 迁移失败:`, error)
      }
    }
    
    console.log(`迁移完成！成功: ${successCount}, 跳过: ${skipCount}, 失败: ${errorCount}`)
    
    // 验证迁移结果
    console.log('\n验证迁移结果...')
    const verifyResult = await db.collection('Users').get()
    let verifySuccess = 0
    let verifyFailed = 0
    
    for (const user of verifyResult.data) {
      if (user.discNameChangeCount !== undefined && 
          Array.isArray(user.discNameChangeHistory)) {
        verifySuccess++
      } else {
        verifyFailed++
        console.error(`验证失败: 用户 ${user.nickName || user._openid} 缺少必要字段`)
      }
    }
    
    console.log(`验证结果: 成功 ${verifySuccess}, 失败 ${verifyFailed}`)
    
    return {
      success: true,
      message: `迁移完成！成功: ${successCount}, 跳过: ${skipCount}, 失败: ${errorCount}`,
      details: {
        total: users.data.length,
        migrated: successCount,
        skipped: skipCount,
        failed: errorCount,
        verified: verifySuccess,
        verifyFailed: verifyFailed
      }
    }
  } catch (error) {
    console.error('迁移过程中发生错误:', error)
    return {
      success: false,
      message: '迁移失败',
      error: error.message
    }
  }
}

// 回滚迁移（仅用于测试）
async function rollbackDiscNameFields() {
  try {
    console.log('开始回滚盘名修改字段迁移...')
    
    const users = await db.collection('Users').get()
    let rollbackCount = 0
    
    for (const user of users.data) {
      if (user.discNameChangeCount !== undefined) {
        await db.collection('Users').doc(user._id).update({
          data: {
            discNameChangeCount: db.command.remove(),
            discNameChangeHistory: db.command.remove(),
            lastDiscNameChangeTime: db.command.remove()
          }
        })
        rollbackCount++
      }
    }
    
    console.log(`回滚完成！处理了 ${rollbackCount} 个用户`)
    return {
      success: true,
      message: `回滚完成！处理了 ${rollbackCount} 个用户`,
      rollbackCount: rollbackCount
    }
  } catch (error) {
    console.error('回滚失败:', error)
    return {
      success: false,
      message: '回滚失败',
      error: error.message
    }
  }
}

// 检查迁移状态
async function checkMigrationStatus() {
  try {
    const users = await db.collection('Users').get()
    let migratedCount = 0
    let notMigratedCount = 0
    
    for (const user of users.data) {
      if (user.discNameChangeCount !== undefined) {
        migratedCount++
      } else {
        notMigratedCount++
      }
    }
    
    const migrationComplete = notMigratedCount === 0
    
    console.log('迁移状态检查:')
    console.log(`总用户数: ${users.data.length}`)
    console.log(`已迁移: ${migratedCount}`)
    console.log(`未迁移: ${notMigratedCount}`)
    console.log(`迁移状态: ${migrationComplete ? '完成' : '未完成'}`)
    
    return {
      success: true,
      data: {
        total: users.data.length,
        migrated: migratedCount,
        notMigrated: notMigratedCount,
        complete: migrationComplete
      }
    }
  } catch (error) {
    console.error('检查迁移状态失败:', error)
    return {
      success: false,
      message: '检查失败',
      error: error.message
    }
  }
}

// 如果是在云函数中运行
exports.main = async (event, context) => {
  const { action = 'migrate' } = event
  
  switch (action) {
    case 'migrate':
      return await migrateDiscNameFields()
    case 'rollback':
      return await rollbackDiscNameFields()
    case 'check':
      return await checkMigrationStatus()
    default:
      return {
        success: false,
        message: '未知操作，支持的操作: migrate, rollback, check'
      }
  }
}

// 如果是在本地运行
if (require.main === module) {
  migrateDiscNameFields().then(result => {
    console.log('迁移结果:', result)
  }).catch(error => {
    console.error('迁移失败:', error)
  })
}
