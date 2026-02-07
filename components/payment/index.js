const WXAPI = require('apifm-wxapi');
// const { wxaCode } = require('../../utils/auth');
Component({
  options: {
    addGlobalClass: true,
  },
  /**
   * 组件的对外属性，是属性名到属性设置的映射表
   */
  properties: {
    money: Number,
    remark: String,
    nextAction: Object,
    extData: Object,
    show: Boolean,
    useCard: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的内部数据，和 properties 一同用于组件的模板渲染
   */
  data: {
    payType: 'wx',
    alipayOpenMod: '0'
  },
  // 组件数据字段监听器，用于监听 properties 和 data 的变化
  observers: {
    'show': function(show) {
      this.setData({
        alipayQrcode: null,
        alipayOpenMod: wx.getStorageSync('alipay')
      })
    }
  },
  lifetimes: {
    attached() {
      getApp().initLanguage(this)
    },
    detached() {
      // 在组件实例被从页面节点树移除时执行
    },
  },
  /**
   * 组件的方法列表
   */
  methods: {
    close() {
      // this.triggerEvent('cancel')
      wx.showModal({
        title: '是否放弃本次付款',
        content: '只差最后一步，即可完成订单支付',
        confirmText: '继续付款',
        cancelText: '放弃',
        confirmColor: '#0000FF',
        cancelColor: '#0000FF',
        success: (res) => {
          if (res.confirm) {
            console.log('用户选择继续付款');
          } else if (res.cancel) {
            console.log('用户选择放弃付款');
            wx.redirectTo({
              url: '/pages/all-orders/index?activeTab=pending'
            });
          }
        }
      });
    },
    payTypeChange(event) {
      this.setData({
        payType: event.detail,
        alipayQrcode: null,
      });
    },
    payTypeClick(event) {
      const { name } = event.currentTarget.dataset;
      this.setData({
        payType: name,
        alipayQrcode: null,
      });
    },
    async submit() {
      console.log("支付调用的接口");
      let token = wx.getStorageSync('payToken')
      if (!token) {
        // token = wx.getStorageSync('token')
        token = getApp().globalData.token
      }
      const postData = {
        token,
        money: this.data.money,
        remark: this.data.remark,
      }
      if (this.data.extData) {
        postData = {
          ...postData,
          ...this.data.extData
        }
      }
      if (this.data.nextAction) {
        postData.nextAction = JSON.stringify(this.data.nextAction)
      }
      postData.payName = postData.remark
      const url = wx.getStorageSync('wxpay_api_url')
      let res
      if (this.data.payType == 'wx') {
        // https://www.yuque.com/apifm/nu0f75/ppadt8
        res = await WXAPI.payVariableUrl(url ? url : '/pay/wx/wxapp', postData)
      } else if (this.data.payType == 'alipay') {
        // https://www.yuque.com/apifm/nu0f75/hguh83ekxsh71cn7
        res = await WXAPI.alipayQrcode(postData)
      } else {
        wx.showModal({
          content: this.data.$t.payment.notSupport,
          showCancel: false
        })
        // this.close()
        return
      }
      if (res.code != 0) {
        wx.showModal({
          content: JSON.stringify(res),
          showCancel: false
        })
        // this.close()
        return
      }
      if (this.data.payType == 'wx') {
        wx.requestPayment({
          timeStamp: res.data.timeStamp,
          nonceStr: res.data.nonceStr,
          package: res.data.package,
          signType: res.data.signType,
          paySign: res.data.paySign,
          fail: aaa => {
            console.error(aaa)
            wx.showToast({
              title: '' + aaa,
              icon: 'none'
            })
          },
          success: () => {
            wx.showToast({
              title: this.data.$t.asset.success
            })
            this.triggerEvent('ok', this.data)
          }
        })
      }
      if (this.data.payType == 'alipay') {
        const qrcodeRes = JSON.parse(res.data.qrcode)
        const alipayQrcode = qrcodeRes.alipay_trade_precreate_response.qr_code
        console.log(alipayQrcode);
        // 生成二维码 https://www.yuque.com/apifm/nu0f75/xrnyo9
        const resQrcode = await WXAPI.commonQrcode({
          content: alipayQrcode,
          width: 650
        })
        if (resQrcode.code != 0) {
          wx.showToast({
            title: resQrcode.msg,
            icon: 'none'
          })
          return
        }
        console.log(resQrcode.data);
        this.setData({
          alipayQrcode: resQrcode.data
        })
      }
    },
    // async submit() {
    //   // 模拟支付，无后端调用
    //   wx.showToast({
    //     title: '支付成功'
    //   })
    //   this.triggerEvent('ok', {
    //     success: true,
    //     mock: true
    //   })
    // },
  }
})