// 数据库迁移脚本：为用户添加头像相关字段
// 运行方式：在微信开发者工具的云开发控制台中执行

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

async function migrateAvatarFields() {
  try {
    console.log('开始迁移用户头像字段...')
    
    // 获取所有用户
    const users = await db.collection('Users').get()
    console.log(`找到 ${users.data.length} 个用户需要迁移`)
    
    let successCount = 0
    let errorCount = 0
    
    // 批量更新用户字段
    for (const user of users.data) {
      try {
        // 检查用户是否已有新字段
        if (user.customAvatarUrl === undefined) {
          await db.collection('Users').doc(user._id).update({
            data: {
              customAvatarUrl: '',           // 自定义头像URL，默认为空
              avatarType: 'wechat',          // 头像类型，默认使用微信头像
              avatarUpdateTime: null         // 头像更新时间，默认为null
            }
          })
          successCount++
          console.log(`用户 ${user.nickName || user._openid} 迁移成功`)
        } else {
          console.log(`用户 ${user.nickName || user._openid} 已存在头像字段，跳过`)
        }
      } catch (error) {
        errorCount++
        console.error(`用户 ${user.nickName || user._openid} 迁移失败:`, error)
      }
    }
    
    console.log(`迁移完成！成功: ${successCount}, 失败: ${errorCount}`)
    return {
      success: true,
      message: `迁移完成！成功: ${successCount}, 失败: ${errorCount}`,
      successCount,
      errorCount
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

// 如果是在云函数中运行
exports.main = async (event, context) => {
  return await migrateAvatarFields()
}

// 如果是在本地运行
if (require.main === module) {
  migrateAvatarFields().then(result => {
    console.log('迁移结果:', result)
  }).catch(error => {
    console.error('迁移失败:', error)
  })
}
