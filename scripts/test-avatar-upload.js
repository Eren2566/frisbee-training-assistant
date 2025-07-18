// 测试头像上传功能
// 在微信开发者工具的控制台中运行

// 测试用户头像更新API
async function testAvatarUpdate() {
  try {
    console.log('开始测试头像更新功能...')
    
    // 模拟头像URL（实际使用时应该是云存储的fileID）
    const testAvatarUrl = 'cloud://test-env.test-avatar/test-avatar.jpg'
    
    const result = await wx.cloud.callFunction({
      name: 'user_service',
      data: {
        action: 'updateAvatar',
        avatarUrl: testAvatarUrl,
        avatarType: 'custom'
      }
    })
    
    console.log('头像更新结果:', result)
    
    if (result.result.success) {
      console.log('✅ 头像更新成功')
      return true
    } else {
      console.error('❌ 头像更新失败:', result.result.message)
      return false
    }
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
    return false
  }
}

// 测试数据库迁移
async function testDatabaseMigration() {
  try {
    console.log('开始测试数据库迁移...')
    
    // 获取当前用户信息
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      console.error('❌ 未找到用户信息，请先登录')
      return false
    }
    
    console.log('当前用户信息:', userInfo)
    
    // 检查是否有新的头像字段
    if (userInfo.hasOwnProperty('customAvatarUrl')) {
      console.log('✅ 用户已有头像字段')
    } else {
      console.log('⚠️ 用户缺少头像字段，需要运行迁移脚本')
    }
    
    return true
  } catch (error) {
    console.error('❌ 测试数据库迁移时发生错误:', error)
    return false
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始运行头像功能测试...')
  
  const tests = [
    { name: '数据库迁移测试', fn: testDatabaseMigration },
    { name: '头像更新API测试', fn: testAvatarUpdate }
  ]
  
  let passedTests = 0
  
  for (const test of tests) {
    console.log(`\n📋 运行测试: ${test.name}`)
    const result = await test.fn()
    if (result) {
      passedTests++
      console.log(`✅ ${test.name} 通过`)
    } else {
      console.log(`❌ ${test.name} 失败`)
    }
  }
  
  console.log(`\n📊 测试结果: ${passedTests}/${tests.length} 通过`)
  
  if (passedTests === tests.length) {
    console.log('🎉 所有测试通过！头像功能可以正常使用')
  } else {
    console.log('⚠️ 部分测试失败，请检查相关配置')
  }
}

// 导出测试函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testAvatarUpdate,
    testDatabaseMigration,
    runAllTests
  }
}

// 如果在浏览器环境中，添加到全局对象
if (typeof window !== 'undefined') {
  window.avatarTests = {
    testAvatarUpdate,
    testDatabaseMigration,
    runAllTests
  }
}

console.log('头像功能测试脚本已加载')
console.log('运行 runAllTests() 开始测试')
console.log('或者单独运行 testAvatarUpdate() 或 testDatabaseMigration()')
