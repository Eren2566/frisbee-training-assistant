// 头像功能部署检查脚本
// 在微信开发者工具控制台中运行

async function checkAvatarDeployment() {
  console.log('🔍 开始检查头像功能部署状态...')
  
  const checks = []
  
  // 1. 检查云函数是否部署
  try {
    console.log('\n📋 检查云函数部署状态...')
    const result = await wx.cloud.callFunction({
      name: 'user_service',
      data: { action: 'test' }
    })
    
    if (result.result) {
      checks.push({ name: '云函数连接', status: 'success', message: '云函数可正常调用' })
    } else {
      checks.push({ name: '云函数连接', status: 'error', message: '云函数调用失败' })
    }
  } catch (error) {
    checks.push({ name: '云函数连接', status: 'error', message: `云函数错误: ${error.message}` })
  }
  
  // 2. 检查云存储是否开通
  try {
    console.log('\n📋 检查云存储状态...')
    // 尝试上传一个测试文件
    const testResult = await wx.cloud.uploadFile({
      cloudPath: 'test/deployment-check.txt',
      filePath: 'data:text/plain;base64,dGVzdA==' // "test" in base64
    })
    
    if (testResult.fileID) {
      checks.push({ name: '云存储服务', status: 'success', message: '云存储可正常使用' })
      
      // 清理测试文件
      try {
        await wx.cloud.deleteFile({
          fileList: [testResult.fileID]
        })
      } catch (e) {
        console.log('清理测试文件失败，可忽略')
      }
    } else {
      checks.push({ name: '云存储服务', status: 'error', message: '云存储上传失败' })
    }
  } catch (error) {
    if (error.errCode === -404011) {
      checks.push({ name: '云存储服务', status: 'error', message: '云存储未开通，请在云开发控制台开通存储服务' })
    } else {
      checks.push({ name: '云存储服务', status: 'error', message: `云存储错误: ${error.message}` })
    }
  }
  
  // 3. 检查用户数据结构
  try {
    console.log('\n📋 检查用户数据结构...')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (userInfo) {
      if (userInfo.hasOwnProperty('customAvatarUrl') && 
          userInfo.hasOwnProperty('avatarType')) {
        checks.push({ name: '用户数据结构', status: 'success', message: '用户数据包含头像字段' })
      } else {
        checks.push({ name: '用户数据结构', status: 'warning', message: '用户数据缺少头像字段，需要运行迁移脚本' })
      }
    } else {
      checks.push({ name: '用户数据结构', status: 'warning', message: '未找到用户信息，请先登录' })
    }
  } catch (error) {
    checks.push({ name: '用户数据结构', status: 'error', message: `检查用户数据失败: ${error.message}` })
  }
  
  // 4. 检查页面组件
  try {
    console.log('\n📋 检查页面组件...')
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    
    if (currentPage && currentPage.route === 'pages/my-profile/my-profile') {
      if (typeof currentPage.chooseAvatar === 'function') {
        checks.push({ name: '页面组件', status: 'success', message: '头像上传组件已正确集成' })
      } else {
        checks.push({ name: '页面组件', status: 'error', message: '头像上传方法未找到' })
      }
    } else {
      checks.push({ name: '页面组件', status: 'warning', message: '请在个人中心页面运行此检查' })
    }
  } catch (error) {
    checks.push({ name: '页面组件', status: 'error', message: `检查页面组件失败: ${error.message}` })
  }
  
  // 输出检查结果
  console.log('\n📊 部署检查结果:')
  console.log('=' * 50)
  
  let successCount = 0
  let warningCount = 0
  let errorCount = 0
  
  checks.forEach(check => {
    const icon = check.status === 'success' ? '✅' : 
                 check.status === 'warning' ? '⚠️' : '❌'
    console.log(`${icon} ${check.name}: ${check.message}`)
    
    if (check.status === 'success') successCount++
    else if (check.status === 'warning') warningCount++
    else errorCount++
  })
  
  console.log('=' * 50)
  console.log(`总计: ${checks.length} 项检查`)
  console.log(`成功: ${successCount} | 警告: ${warningCount} | 错误: ${errorCount}`)
  
  if (errorCount === 0 && warningCount === 0) {
    console.log('\n🎉 所有检查通过！头像功能已正确部署')
  } else if (errorCount === 0) {
    console.log('\n⚠️ 基本功能正常，但有一些警告需要注意')
  } else {
    console.log('\n❌ 发现错误，请根据提示修复后重新检查')
  }
  
  return {
    total: checks.length,
    success: successCount,
    warning: warningCount,
    error: errorCount,
    checks: checks
  }
}

// 快速检查函数
async function quickCheck() {
  console.log('🚀 快速检查头像功能...')
  
  try {
    // 检查基本功能
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      console.log('❌ 请先登录小程序')
      return false
    }
    
    console.log('✅ 用户已登录')
    console.log('✅ 可以开始测试头像上传功能')
    console.log('\n💡 使用方法:')
    console.log('1. 进入个人中心页面')
    console.log('2. 点击头像区域')
    console.log('3. 选择图片上传')
    
    return true
  } catch (error) {
    console.log('❌ 快速检查失败:', error.message)
    return false
  }
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkAvatarDeployment,
    quickCheck
  }
}

// 添加到全局对象
if (typeof window !== 'undefined') {
  window.avatarDeploymentCheck = {
    checkAvatarDeployment,
    quickCheck
  }
}

console.log('头像功能部署检查脚本已加载')
console.log('运行 checkAvatarDeployment() 进行完整检查')
console.log('运行 quickCheck() 进行快速检查')
