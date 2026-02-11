const WXAPI = require('apifm-wxapi')
const CONFIG = require('config.js')
const AUTH = require('utils/auth')
const i18n = require("i18n/index")
App({
  onLaunch: function() {
    const $t = i18n.$t()
    WXAPI.init(CONFIG.subDomain)
    WXAPI.setMerchantId(CONFIG.merchantId)

    WXAPI.queryConfigBatch('hotpotId,QQ_MAP_KEY,create_order_select_time,packaging_fee').then(res => {
      if (res.code == 0) {
        res.data.forEach(config => {
        
          // 存储到全局变量
          this.globalData.config[config.key] = config.value;
          console.log(config.key, this.globalData.config[config.key]);
        })
        if (this.configLoadOK) {
          this.configLoadOK()
        }
      }
    })
  },
  onShow (e) {
    AUTH.checkHasLogined().then(isLogined => {
      if (!isLogined) {
        AUTH.authorize().then(() => {
          this.getUserApiInfo()
        })
      } else {
        this.getUserApiInfo()
      }
    })
  },
  initLanguage(_this) {
    _this.setData({
      $t: i18n.$t(),
    })
  },
  async getUserApiInfo() {
    const token = this.globalData.token
    if (!token) {
      return null
    }
    // https://www.yuque.com/apifm/nu0f75/zgf8pu
    const res = await WXAPI.userDetail(token)
    console.log("getUserApiInfo",res)
    if (res.code == 0) {
      this.globalData.apiUserInfoMap = res.data
      if (this.getUserDetailOK) {
        this.getUserDetailOK(res.data)
      }
      return res.data
    }
  },
  globalData: {
    isConnected: true,
    token:"",
    payToken:"",
    wxpay_api_url:"",
    uid:"",
    currentCategory:"",
    peisongType:"",
    shopInfo:"",
    refreshIndex:"",
    config: {} // 存储配置数据的全局对象
  }
})