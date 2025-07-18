// 测试删除功能的脚本
// 在微信开发者工具控制台中运行

async function testDeleteFunction() {
  try {
    console.log('🔧 测试删除功能...')
    
    // 首先获取一个训练ID进行测试
    const listResult = await wx.cloud.callFunction({
      name: 'event_service',
      data: {
        action: 'getList'
      }
    })
    
    console.log('获取训练列表结果:', listResult)
    
    if (!listResult.result.success) {
      console.error('❌ 获取训练列表失败:', listResult.result.message)
      return
    }
    
    const events = listResult.result.data
    if (events.length === 0) {
      console.log('⚠️ 没有可用的训练进行删除测试')
      return
    }
    
    // 找一个未来的训练进行测试
    const futureEvent = events.find(event => {
      const eventTime = new Date(event.eventTime)
      const now = new Date()
      const hoursUntilEvent = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      return hoursUntilEvent > 3 // 3小时后的训练
    })
    
    if (!futureEvent) {
      console.log('⚠️ 没有找到适合删除测试的训练（需要3小时后的训练）')
      return
    }
    
    console.log('📋 找到测试训练:', futureEvent.title, futureEvent._id)
    
    // 测试删除功能
    const deleteResult = await wx.cloud.callFunction({
      name: 'event_service',
      data: {
        action: 'delete',
        eventId: futureEvent._id,
        deleteReason: '功能测试删除'
      }
    })
    
    console.log('删除测试结果:', deleteResult)
    
    if (deleteResult.result.success) {
      console.log('✅ 删除功能测试成功!')
      console.log('删除结果:', deleteResult.result.data)
    } else {
      console.error('❌ 删除功能测试失败:', deleteResult.result.message)
      console.error('错误详情:', deleteResult.result.error)
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  }
}

// 测试云函数基本连接
async function testBasicConnection() {
  try {
    console.log('🔗 测试云函数基本连接...')
    
    const result = await wx.cloud.callFunction({
      name: 'event_service',
      data: {
        action: 'getList'
      }
    })
    
    console.log('基本连接测试结果:', result)
    
    if (result.result && result.result.success) {
      console.log('✅ 云函数连接正常')
      return true
    } else {
      console.error('❌ 云函数连接异常')
      return false
    }
  } catch (error) {
    console.error('❌ 云函数连接失败:', error)
    return false
  }
}

// 测试删除操作的参数
async function testDeleteParameters() {
  try {
    console.log('📝 测试删除操作参数...')
    
    // 测试无效的eventId
    const result1 = await wx.cloud.callFunction({
      name: 'event_service',
      data: {
        action: 'delete',
        eventId: '',
        deleteReason: '测试'
      }
    })
    
    console.log('空eventId测试:', result1)
    
    // 测试不存在的eventId
    const result2 = await wx.cloud.callFunction({
      name: 'event_service',
      data: {
        action: 'delete',
        eventId: 'nonexistent_id',
        deleteReason: '测试'
      }
    })
    
    console.log('不存在eventId测试:', result2)
    
  } catch (error) {
    console.error('❌ 参数测试失败:', error)
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始运行删除功能诊断测试...\n')
  
  // 1. 测试基本连接
  const connectionOk = await testBasicConnection()
  if (!connectionOk) {
    console.log('❌ 基本连接失败，停止后续测试')
    return
  }
  
  console.log('\n' + '='.repeat(50))
  
  // 2. 测试参数验证
  await testDeleteParameters()
  
  console.log('\n' + '='.repeat(50))
  
  // 3. 测试实际删除功能
  await testDeleteFunction()
  
  console.log('\n🏁 测试完成')
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.testDeleteFunction = testDeleteFunction
  window.testBasicConnection = testBasicConnection
  window.testDeleteParameters = testDeleteParameters
  window.runAllTests = runAllTests
}

console.log('删除功能诊断测试器已加载')
console.log('运行 runAllTests() 开始完整测试')
console.log('运行 testBasicConnection() 测试基本连接')
console.log('运行 testDeleteFunction() 测试删除功能')
