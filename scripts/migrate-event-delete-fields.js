// 数据库迁移脚本：为训练活动添加软删除相关字段
// 运行方式：在微信开发者工具的云开发控制台中执行

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

async function migrateEventDeleteFields() {
  try {
    console.log('开始迁移训练活动软删除字段...')
    
    // 获取所有训练活动
    const events = await db.collection('Events').get()
    console.log(`找到 ${events.data.length} 个训练活动需要迁移`)
    
    let successCount = 0
    let errorCount = 0
    let skipCount = 0
    
    // 批量更新训练活动字段
    for (const event of events.data) {
      try {
        // 检查是否已有软删除字段
        if (event.isDeleted === undefined) {
          await db.collection('Events').doc(event._id).update({
            data: {
              isDeleted: false,           // 默认未删除
              deleteTime: null,           // 删除时间
              deletedBy: null,            // 删除操作者
              deleteReason: null          // 删除原因
            }
          })
          
          successCount++
          console.log(`训练活动 ${event.title} 迁移成功`)
        } else {
          skipCount++
          console.log(`训练活动 ${event.title} 已存在删除字段，跳过`)
        }
      } catch (error) {
        errorCount++
        console.error(`训练活动 ${event.title} 迁移失败:`, error)
      }
    }
    
    console.log(`迁移完成！成功: ${successCount}, 跳过: ${skipCount}, 失败: ${errorCount}`)
    
    // 验证迁移结果
    console.log('\n验证迁移结果...')
    const verifyResult = await db.collection('Events').get()
    let verifySuccess = 0
    let verifyFailed = 0
    
    for (const event of verifyResult.data) {
      if (event.isDeleted !== undefined && 
          event.deleteTime !== undefined &&
          event.deletedBy !== undefined &&
          event.deleteReason !== undefined) {
        verifySuccess++
      } else {
        verifyFailed++
        console.error(`验证失败: 训练活动 ${event.title} 缺少必要字段`)
      }
    }
    
    console.log(`验证结果: 成功 ${verifySuccess}, 失败 ${verifyFailed}`)
    
    return {
      success: true,
      message: `迁移完成！成功: ${successCount}, 跳过: ${skipCount}, 失败: ${errorCount}`,
      details: {
        total: events.data.length,
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

// 检查迁移状态
async function checkMigrationStatus() {
  try {
    const events = await db.collection('Events').get()
    let migratedCount = 0
    let notMigratedCount = 0
    
    for (const event of events.data) {
      if (event.isDeleted !== undefined) {
        migratedCount++
      } else {
        notMigratedCount++
      }
    }
    
    console.log('迁移状态检查:')
    console.log(`总训练数: ${events.data.length}`)
    console.log(`已迁移: ${migratedCount}`)
    console.log(`未迁移: ${notMigratedCount}`)
    
    return {
      success: true,
      data: {
        total: events.data.length,
        migrated: migratedCount,
        notMigrated: notMigratedCount,
        complete: notMigratedCount === 0
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
      return await migrateEventDeleteFields()
    case 'check':
      return await checkMigrationStatus()
    default:
      return {
        success: false,
        message: '未知操作，支持的操作: migrate, check'
      }
  }
}

// 如果是在本地运行
if (require.main === module) {
  migrateEventDeleteFields().then(result => {
    console.log('迁移结果:', result)
  }).catch(error => {
    console.error('迁移失败:', error)
  })
}
