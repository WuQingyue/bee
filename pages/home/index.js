const WXAPI = require('apifm-wxapi')
Page({
  data: {
    banners:[],
    apiUserInfoMap:{},
    nick: '',
    nickShow: false,
    loading: {
      banner: true,
      userInfo: true
    }
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
      this.setData({
        'loading.userInfo': false
      })
      return
    }
    this.setData({
      apiUserInfoMap,
      nick: apiUserInfoMap.base.nick,
      'loading.userInfo': false
    })
  },
  async banners() {
    // https://www.yuque.com/apifm/nu0f75/ms21ki
    const res = await WXAPI.banners({
      type: 'shouye'
    })
    if (res.code == 0) {
      this.setData({
        banners: res.data,
        'loading.banner': false
      })
    } else {
      this.setData({
        'loading.banner': false
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
      title: getApp().globalData.config.mallName + ' ' + getApp().globalData.config.share_profile,
      path: '/pages/home/index?inviter_id=' + (getApp().globalData.uid || ''),
      imageUrl: getApp().globalData.config.share_pic
    }
  },
  onShareTimeline() {
    return {
      title: getApp().globalData.config.mallName + ' ' + getApp().globalData.config.share_profile,
      query: 'inviter_id=' + (getApp().globalData.uid || ''),
      imageUrl: getApp().globalData.config.share_pic
    }
  },
  changePeisongType(e) {
    const peisongType = e.currentTarget.dataset.type
    const hotpotId = Number(getApp().globalData.config.hotpotId) 
    console.log("hotpotId",hotpotId)
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

    getApp().globalData.peisongType = peisongType
    
    // kd: 配送, zq: 自取
    wx.navigateTo({
      url: '/package-index/pages/index/index',
    })
  },

  touming() {
    wx.navigateTo({
      url: '/package-other/pages/about/index?key=toumingshicai',
    })
  },
  goOrders() {
    wx.navigateTo({
      url: '/package-order/pages/all-orders/index',
    })
  },
  goAddress() {
    wx.navigateTo({
      url: '/package-user/pages/ad/index',
    })
  },
  editNick() {
    this.setData({
      nickShow: true
    })
  },
  async _editNick() {
    if (!this.data.nick) {
      wx.showToast({
        title: this.data.$t.my.nickRequired,
        icon: 'none'
      })
      return
    }
    const postData = {
      token: getApp().globalData.token,
      nick: this.data.nick,
    }
    const res = await WXAPI.modifyUserInfoV2(postData)
    if (res.code != 0) {
      wx.showToast({
        title: res.msg,
        icon: 'none'
      })
      return
    }
    wx.showToast({
      title: this.data.$t.common.submitSuccess,
    })
    getApp().getUserApiInfo().then(apiUserInfoMap => {
      this.processGotUserDetail(apiUserInfoMap)
    })
  },
})