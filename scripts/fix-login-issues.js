// 登录问题快速修复脚本
// 在微信开发者工具的控制台中运行

(function() {
  console.log('🔧 开始诊断登录问题...\n')
  
  // 1. 检查云开发初始化状态
  function checkCloudInit() {
    console.log('1️⃣ 检查云开发初始化状态...')
    
    if (!wx.cloud) {
      console.error('❌ wx.cloud 不存在，请检查基础库版本')
      return false
    }
    
    console.log('✅ wx.cloud 存在')
    return true
  }
  
  // 2. 测试云函数连接
  function testCloudFunction() {
    console.log('\n2️⃣ 测试云函数连接...')
    
    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'user_service',
        data: { action: 'test' },
        success: (res) => {
          console.log('✅ 云函数连接成功:', res)
          resolve(true)
        },
        fail: (err) => {
          console.error('❌ 云函数连接失败:', err)
          
          if (err.errCode === -404001) {
            console.error('💡 建议: 云函数不存在，请部署 user_service 云函数')
          } else if (err.errCode === -1) {
            console.error('💡 建议: 网络连接失败，请检查网络设置')
          }
          
          resolve(false)
        }
      })
    })
  }
  
  // 3. 检查用户授权状态
  function checkUserAuth() {
    console.log('\n3️⃣ 检查用户授权状态...')
    
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          console.log('✅ 用户授权状态:', res.authSetting)
          
          if (res.authSetting['scope.userInfo']) {
            console.log('✅ 用户已授权获取用户信息')
          } else {
            console.log('ℹ️ 用户未授权获取用户信息（正常，需要用户主动授权）')
          }
          
          resolve(true)
        },
        fail: (err) => {
          console.error('❌ 获取授权状态失败:', err)
          resolve(false)
        }
      })
    })
  }
  
  // 4. 检查网络状态
  function checkNetwork() {
    console.log('\n4️⃣ 检查网络状态...')
    
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          console.log('✅ 网络类型:', res.networkType)
          
          if (res.networkType === 'none') {
            console.error('❌ 无网络连接')
            resolve(false)
          } else {
            console.log('✅ 网络连接正常')
            resolve(true)
          }
        },
        fail: (err) => {
          console.error('❌ 获取网络状态失败:', err)
          resolve(false)
        }
      })
    })
  }
  
  // 5. 检查本地存储
  function checkStorage() {
    console.log('\n5️⃣ 检查本地存储...')
    
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        console.log('✅ 本地存储中有用户信息:', userInfo)
      } else {
        console.log('ℹ️ 本地存储中无用户信息（正常，首次登录）')
      }
      return true
    } catch (err) {
      console.error('❌ 读取本地存储失败:', err)
      return false
    }
  }
  
  // 6. 提供修复建议
  function provideSuggestions(results) {
    console.log('\n📋 诊断结果总结:')
    console.log('云开发初始化:', results.cloudInit ? '✅' : '❌')
    console.log('云函数连接:', results.cloudFunction ? '✅' : '❌')
    console.log('用户授权检查:', results.userAuth ? '✅' : '❌')
    console.log('网络连接:', results.network ? '✅' : '❌')
    console.log('本地存储:', results.storage ? '✅' : '❌')
    
    console.log('\n🔧 修复建议:')
    
    if (!results.cloudInit) {
      console.log('1. 检查微信开发者工具的基础库版本，建议使用 3.0.0+')
      console.log('2. 确认项目已正确配置云开发')
    }
    
    if (!results.cloudFunction) {
      console.log('1. 在微信开发者工具中部署云函数:')
      console.log('   - 右键 cloudfunctions 文件夹')
      console.log('   - 选择"上传并部署：云端安装依赖"')
      console.log('2. 检查云开发环境ID是否正确')
      console.log('3. 确认云开发服务已开通')
    }
    
    if (!results.network) {
      console.log('1. 检查网络连接')
      console.log('2. 检查微信开发者工具的代理设置')
      console.log('3. 尝试切换网络环境')
    }
    
    if (results.cloudInit && results.cloudFunction && results.network) {
      console.log('🎉 基础环境检查通过！如果仍有问题，请：')
      console.log('1. 清除微信开发者工具缓存')
      console.log('2. 重新编译项目')
      console.log('3. 检查具体的错误日志')
    }
  }
  
  // 执行诊断
  async function runDiagnosis() {
    const results = {
      cloudInit: checkCloudInit(),
      cloudFunction: false,
      userAuth: false,
      network: false,
      storage: checkStorage()
    }
    
    if (results.cloudInit) {
      results.cloudFunction = await testCloudFunction()
      results.userAuth = await checkUserAuth()
      results.network = await checkNetwork()
    }
    
    provideSuggestions(results)
  }
  
  // 开始诊断
  runDiagnosis()
})()

// 使用说明：
// 1. 复制此脚本到微信开发者工具的控制台
// 2. 按回车执行
// 3. 根据诊断结果进行相应的修复操作
