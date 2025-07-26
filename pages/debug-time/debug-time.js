// pages/debug-time/debug-time.js
const app = getApp()
const { TimeUtils } = require('../../utils/common')

Page({
  data: {
    testResults: [],
    deviceInfo: {},
    systemInfo: {}
  },

  onLoad() {
    this.getSystemInfo()
    this.runTimeTests()
  },

  // 获取系统信息
  getSystemInfo() {
    const systemInfo = wx.getSystemInfoSync()
    const deviceInfo = {
      platform: systemInfo.platform,
      system: systemInfo.system,
      version: systemInfo.version,
      SDKVersion: systemInfo.SDKVersion,
      brand: systemInfo.brand,
      model: systemInfo.model
    }
    
    this.setData({
      deviceInfo: deviceInfo,
      systemInfo: systemInfo
    })
    
    console.log('设备信息:', deviceInfo)
    console.log('系统信息:', systemInfo)
  },

  // 运行时间测试
  runTimeTests() {
    const testCases = [
      // 测试不同格式的时间字符串
      '2025-07-26T10:00:00.000Z',
      '2025-07-26 18:00:00',
      '2025-07-26T18:00:00+08:00',
      new Date('2025-07-26 18:00:00'),
      new Date(),
      // 测试可能的问题时间
      '2025-07-26T02:00:00.000Z', // UTC时间，可能导致时区问题
      '2025-07-26 02:00:00'
    ]

    const results = []

    testCases.forEach((testCase, index) => {
      const result = {
        index: index + 1,
        input: testCase,
        inputType: typeof testCase,
        isDate: testCase instanceof Date
      }

      try {
        // 测试Date构造
        const dateObj = new Date(testCase)
        result.dateObj = dateObj
        result.dateValid = !isNaN(dateObj.getTime())
        result.timestamp = dateObj.getTime()
        
        // 测试TimeUtils.formatEventTime
        try {
          result.formatEventTime = TimeUtils.formatEventTime(testCase)
        } catch (e) {
          result.formatEventTimeError = e.message
        }
        
        // 测试TimeUtils.formatEventDetailTime
        try {
          result.formatEventDetailTime = TimeUtils.formatEventDetailTime(testCase)
        } catch (e) {
          result.formatEventDetailTimeError = e.message
        }
        
        // 测试原生格式化
        try {
          result.nativeFormat = dateObj.toLocaleString('zh-CN')
        } catch (e) {
          result.nativeFormatError = e.message
        }

      } catch (e) {
        result.error = e.message
      }

      results.push(result)
      console.log(`测试用例 ${index + 1}:`, result)
    })

    this.setData({
      testResults: results
    })
  },

  // 测试特定时间字符串
  testSpecificTime() {
    const testTime = '2025-07-26T10:00:00.000Z'
    
    console.log('=== 特定时间测试 ===')
    console.log('输入:', testTime)
    
    const date = new Date(testTime)
    console.log('Date对象:', date)
    console.log('时间戳:', date.getTime())
    console.log('本地时间字符串:', date.toString())
    console.log('UTC时间字符串:', date.toUTCString())
    console.log('ISO字符串:', date.toISOString())
    console.log('本地化字符串:', date.toLocaleString('zh-CN'))
    
    console.log('年:', date.getFullYear())
    console.log('月:', date.getMonth() + 1)
    console.log('日:', date.getDate())
    console.log('时:', date.getHours())
    console.log('分:', date.getMinutes())
    
    const formatted = TimeUtils.formatEventDetailTime(testTime)
    console.log('TimeUtils格式化结果:', formatted)
  },

  // 复制调试信息
  copyDebugInfo() {
    const debugInfo = {
      deviceInfo: this.data.deviceInfo,
      testResults: this.data.testResults,
      timestamp: new Date().toISOString()
    }
    
    wx.setClipboardData({
      data: JSON.stringify(debugInfo, null, 2),
      success: () => {
        wx.showToast({
          title: '调试信息已复制',
          icon: 'success'
        })
      }
    })
  }
})
