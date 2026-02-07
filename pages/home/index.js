const WXAPI = require('apifm-wxapi')
Page({
  data: {
    
  },
  onLoad(e) {
    getApp().initLanguage(this)
    getApp().getUserDetailOK = (apiUserInfoMap) => {
      this.processGotUserDetail(apiUserInfoMap)
    }
    this.banners()
  },
  onShow() {
    getApp().getUserApiInfo().then(apiUserInfoMap => {
      this.processGotUserDetail(apiUserInfoMap)
    })
  },
  async processGotUserDetail(apiUserInfoMap) {
    if (!apiUserInfoMap) {
      return
    }
    this.setData({
      apiUserInfoMap,
      nick: apiUserInfoMap.base.nick
    })
  },
  async banners() {
    // https://www.yuque.com/apifm/nu0f75/ms21ki
    const res = await WXAPI.banners({
      type: 'shouye'
    })
    if (res.code == 0) {
      this.setData({
        banners: res.data
      })
    }
  },
  tapBanner(e) {
    const url = e.currentTarget.dataset.url
    if (url) {
      wx.navigateTo({
        url
      })
    }
  },
  onShareAppMessage() {
    return {
      title: wx.getStorageSync('mallName') + ' ' + wx.getStorageSync('share_profile'),
      path: '/pages/home/index?inviter_id=' + (wx.getStorageSync('uid') || ''),
      imageUrl: wx.getStorageSync('share_pic')
    }
  },
  onShareTimeline() {
    return {
      title: wx.getStorageSync('mallName') + ' ' + wx.getStorageSync('share_profile'),
      query: 'inviter_id=' + (wx.getStorageSync('uid') || ''),
      imageUrl: wx.getStorageSync('share_pic')
    }
  },
  // changeLang() {
  //   getApp().changeLang(this)
  // },
  huiyuan() {
    wx.navigateTo({
      url: '/pages/member-center/index',
    })
  },
  coupon() {
    wx.navigateTo({
      url: '/pages/coupons/index',
    })
  },
  changePeisongType(e) {
    const peisongType = e.currentTarget.dataset.type
    const hotpotId = Number(wx.getStorageSync('hotpotId')) 
    console.log("hotpotId",hotpotId)
    console.log("typeof hotpotId ",typeof hotpotId )
    // 检查是否是配送模式且 hotpotId 不存在
    if (peisongType === 'kd' && hotpotId === 0 ) {
      wx.showModal({
        title: '提示',
        content: '目前暂不支持配送',
        showCancel: false,
        confirmText: '我知道了'
      })
      return
    }

    wx.setStorageSync('peisongType', peisongType)
    console.log("peisongType", peisongType)
    
    // kd: 配送, zq: 自取
    wx.switchTab({
      url: '/pages/index/index',
    })
  },
  about() {
    wx.navigateTo({
      url: '/pages/about/index',
    })
  },
  about() {
    wx.navigateTo({
      url: '/pages/about/index',
    })
  },
  touming() {
    wx.navigateTo({
      url: '/pages/about/index?key=toumingshicai',
    })
  },
  card() {
    wx.navigateTo({
      url: '/pages/card/index',
    })
  },
})