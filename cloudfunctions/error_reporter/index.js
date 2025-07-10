// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 记录错误信息到数据库
    const errorRecord = {
      openid: wxContext.OPENID,
      tag: event.tag || 'Unknown',
      message: event.message || '',
      error: event.error || '',
      stack: event.stack || '',
      timestamp: new Date(event.timestamp) || new Date(),
      userInfo: event.userInfo || null,
      systemInfo: event.systemInfo || null,
      createTime: new Date()
    }

    // 可选：只在生产环境记录错误
    if (process.env.NODE_ENV === 'production') {
      await db.collection('ErrorLogs').add({
        data: errorRecord
      })
    }

    // 输出到云函数日志
    console.error('客户端错误上报:', errorRecord)

    return {
      success: true,
      message: '错误已记录'
    }
  } catch (error) {
    console.error('错误上报失败:', error)
    return {
      success: false,
      message: '错误上报失败',
      error: error.message
    }
  }
}
