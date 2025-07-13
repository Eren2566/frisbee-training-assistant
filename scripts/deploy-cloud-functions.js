// 云函数部署脚本
// 使用方法：在微信开发者工具的终端中运行此脚本

const fs = require('fs')
const path = require('path')

// 云函数列表
const cloudFunctions = [
  'user_service',
  'event_service', 
  'registration_service',
  'analytics_service',
  'error_reporter',
  'system_service'
]

// 检查云函数目录
function checkCloudFunctions() {
  console.log('检查云函数目录...')
  
  const cloudfunctionsDir = path.join(__dirname, '../cloudfunctions')
  
  if (!fs.existsSync(cloudfunctionsDir)) {
    console.error('❌ cloudfunctions 目录不存在')
    return false
  }
  
  let allExists = true
  
  cloudFunctions.forEach(funcName => {
    const funcDir = path.join(cloudfunctionsDir, funcName)
    const indexFile = path.join(funcDir, 'index.js')
    const packageFile = path.join(funcDir, 'package.json')
    
    if (!fs.existsSync(funcDir)) {
      console.error(`❌ 云函数目录不存在: ${funcName}`)
      allExists = false
    } else if (!fs.existsSync(indexFile)) {
      console.error(`❌ 云函数入口文件不存在: ${funcName}/index.js`)
      allExists = false
    } else if (!fs.existsSync(packageFile)) {
      console.error(`❌ 云函数配置文件不存在: ${funcName}/package.json`)
      allExists = false
    } else {
      console.log(`✅ 云函数检查通过: ${funcName}`)
    }
  })
  
  return allExists
}

// 检查项目配置
function checkProjectConfig() {
  console.log('\n检查项目配置...')
  
  const projectConfigFile = path.join(__dirname, '../project.config.json')
  
  if (!fs.existsSync(projectConfigFile)) {
    console.error('❌ project.config.json 文件不存在')
    return false
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(projectConfigFile, 'utf8'))
    
    if (!config.appid) {
      console.error('❌ 项目配置中缺少 appid')
      return false
    }
    
    if (!config.cloudfunctionRoot) {
      console.error('❌ 项目配置中缺少 cloudfunctionRoot')
      return false
    }
    
    console.log(`✅ AppID: ${config.appid}`)
    console.log(`✅ 云函数根目录: ${config.cloudfunctionRoot}`)
    
    return true
  } catch (error) {
    console.error('❌ 项目配置文件格式错误:', error.message)
    return false
  }
}

// 主函数
function main() {
  console.log('🚀 开始检查云函数部署环境...\n')
  
  const functionsOk = checkCloudFunctions()
  const configOk = checkProjectConfig()
  
  console.log('\n📋 检查结果:')
  console.log(`云函数检查: ${functionsOk ? '✅ 通过' : '❌ 失败'}`)
  console.log(`项目配置检查: ${configOk ? '✅ 通过' : '❌ 失败'}`)
  
  if (functionsOk && configOk) {
    console.log('\n🎉 环境检查通过！')
    console.log('\n📝 部署步骤:')
    console.log('1. 在微信开发者工具中打开项目')
    console.log('2. 点击工具栏的"云开发"按钮')
    console.log('3. 在云开发控制台中创建环境（如果还没有）')
    console.log('4. 右键点击 cloudfunctions 文件夹')
    console.log('5. 选择"上传并部署：云端安装依赖"')
    console.log('6. 等待所有云函数部署完成')
    console.log('\n或者单独部署云函数:')
    cloudFunctions.forEach(funcName => {
      console.log(`- 右键 cloudfunctions/${funcName} -> 上传并部署`)
    })
  } else {
    console.log('\n❌ 环境检查失败，请修复上述问题后重试')
  }
}

// 运行检查
main()
