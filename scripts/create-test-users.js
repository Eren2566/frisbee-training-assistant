// scripts/create-test-users.js - 创建测试用户数据脚本
// 在云开发控制台的数据库中手动执行此脚本内容

/**
 * 测试用户数据
 * 包含不同性别、研究所的完整用户信息
 */
const testUsers = [
  {
    _openid: "test_admin_001",
    nickName: "队长张三",
    avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKxxxxxxx/132",
    role: "admin",
    isInfoCompleted: true,
    gender: "男",
    institute: "卫星互联",
    realName: "张三",
    discName: "飞盘队长",
    contactInfo: "13800138001",
    createTime: new Date("2025-01-01T08:00:00.000Z"),
    updateTime: new Date("2025-01-01T08:30:00.000Z")
  },
  {
    _openid: "test_member_001",
    nickName: "队员李四",
    avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKyyyyyy/132",
    role: "member",
    isInfoCompleted: true,
    gender: "男",
    institute: "工业软件",
    realName: "李四",
    discName: "闪电侠",
    contactInfo: "13800138002",
    createTime: new Date("2025-01-01T09:00:00.000Z"),
    updateTime: new Date("2025-01-01T09:30:00.000Z")
  },
  {
    _openid: "test_member_002",
    nickName: "队员王五",
    avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKzzzzzz/132",
    role: "member",
    isInfoCompleted: true,
    gender: "女",
    institute: "集成电路",
    realName: "王五",
    discName: "飞燕",
    contactInfo: "13800138003",
    createTime: new Date("2025-01-01T10:00:00.000Z"),
    updateTime: new Date("2025-01-01T10:30:00.000Z")
  },
  {
    _openid: "test_member_003",
    nickName: "队员赵六",
    avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKaaaaaa/132",
    role: "member",
    isInfoCompleted: true,
    gender: "女",
    institute: "先进信息",
    realName: "赵六",
    discName: "风行者",
    contactInfo: "13800138004",
    createTime: new Date("2025-01-01T11:00:00.000Z"),
    updateTime: new Date("2025-01-01T11:30:00.000Z")
  },
  {
    _openid: "test_member_004",
    nickName: "队员孙七",
    avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKbbbbb/132",
    role: "member",
    isInfoCompleted: true,
    gender: "男",
    institute: "先进视觉",
    realName: "孙七",
    discName: "追风",
    contactInfo: "13800138005",
    createTime: new Date("2025-01-01T12:00:00.000Z"),
    updateTime: new Date("2025-01-01T12:30:00.000Z")
  },
  {
    _openid: "test_member_005",
    nickName: "队员周八",
    avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKcccccc/132",
    role: "member",
    isInfoCompleted: true,
    gender: "女",
    institute: "汽车电子",
    realName: "周八",
    discName: "疾风",
    contactInfo: "13800138006",
    createTime: new Date("2025-01-01T13:00:00.000Z"),
    updateTime: new Date("2025-01-01T13:30:00.000Z")
  },
  {
    _openid: "test_member_006",
    nickName: "队员吴九",
    avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKdddddd/132",
    role: "member",
    isInfoCompleted: true,
    gender: "男",
    institute: "其他",
    realName: "吴九",
    discName: "雷霆",
    contactInfo: "13800138007",
    createTime: new Date("2025-01-01T14:00:00.000Z"),
    updateTime: new Date("2025-01-01T14:30:00.000Z")
  }
]

/**
 * 使用说明：
 * 1. 在云开发控制台 → 数据库 → Users 集合
 * 2. 点击"添加记录"按钮
 * 3. 将上述每个用户对象复制粘贴到记录中
 * 4. 或者使用云函数批量插入
 */

/**
 * 云函数批量插入代码（可在云函数中执行）：
 */
const batchInsertUsers = async () => {
  const db = cloud.database()
  
  try {
    // 清除现有测试数据
    await db.collection('Users').where({
      _openid: db.RegExp({
        regexp: '^test_',
        options: 'i'
      })
    }).remove()
    
    // 批量插入测试用户
    for (const user of testUsers) {
      await db.collection('Users').add({
        data: user
      })
      console.log(`创建测试用户: ${user.discName} (${user.realName})`)
    }
    
    console.log('测试用户创建完成！')
    return {
      success: true,
      message: '测试用户创建成功',
      count: testUsers.length
    }
  } catch (error) {
    console.error('创建测试用户失败:', error)
    return {
      success: false,
      message: '创建测试用户失败',
      error: error.message
    }
  }
}

module.exports = {
  testUsers,
  batchInsertUsers
}
