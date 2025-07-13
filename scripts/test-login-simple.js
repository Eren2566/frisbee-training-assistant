// 简化版登录测试脚本
// 在微信开发者工具控制台中直接运行

console.log('🔍 开始简化登录测试...')

// 1. 检查云开发基础环境
console.log('\n1️⃣ 检查云开发环境...')
if (wx.cloud) {
  console.log('✅ wx.cloud 可用')
  
  // 2. 测试云函数
  console.log('\n2️⃣ 测试云函数连接...')
  wx.cloud.callFunction({
    name: 'user_service',
    data: { action: 'test' },
    success: (res) => {
      console.log('✅ 云函数测试成功:', res)
      
      // 3. 测试登录流程
      console.log('\n3️⃣ 测试登录流程...')
      wx.cloud.callFunction({
        name: 'user_service',
        data: { 
          action: 'login',
          nickName: '测试用户',
          avatarUrl: ''
        },
        success: (loginRes) => {
          console.log('✅ 登录测试成功:', loginRes)
          console.log('\n🎉 所有测试通过！登录功能应该正常工作')
        },
        fail: (loginErr) => {
          console.error('❌ 登录测试失败:', loginErr)
          console.log('\n💡 建议检查数据库权限配置')
        }
      })
    },
    fail: (err) => {
      console.error('❌ 云函数测试失败:', err)
      
      if (err.errCode === -404001) {
        console.log('\n💡 解决方案:')
        console.log('1. 右键点击 cloudfunctions 文件夹')
        console.log('2. 选择 "上传并部署：云端安装依赖"')
        console.log('3. 等待部署完成后重试')
      } else {
        console.log('\n💡 其他可能的解决方案:')
        console.log('1. 检查云开发环境ID配置')
        console.log('2. 确认云开发服务已开通')
        console.log('3. 检查网络连接')
      }
    }
  })
} else {
  console.error('❌ wx.cloud 不可用')
  console.log('\n💡 解决方案:')
  console.log('1. 检查基础库版本（建议 3.0.0+）')
  console.log('2. 确认项目已配置云开发')
}

// 4. 检查项目配置
console.log('\n4️⃣ 当前页面路径:', getCurrentPages()[getCurrentPages().length - 1].route)

// 使用说明
console.log('\n📖 使用说明:')
console.log('如果看到 "所有测试通过"，说明登录功能正常')
console.log('如果有错误，请按照提示的解决方案操作')
