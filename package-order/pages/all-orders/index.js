const WXAPI = require('apifm-wxapi')
const AUTH = require('../../../utils/auth')
const APP = getApp()
APP.configLoadOK = () => {

}
Page({
  data: {
    apiOk: false,
    // 顶部导航标签
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待支付' },
      { key: 'shipped', label: '已发货' },
      { key: 'pickup', label: '待取餐' },
      { key: 'finished', label: '已完成' },
      { key: 'canceled', label: '已取消' },
    ],
    activeTab: 'all',      // 当前选中的标签
    orderListAll: null,    // 原始订单列表
    orderList: null        // 当前展示的订单列表（按标签过滤）
  },
  cancelOrderTap: function(e) {
    const that = this;
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      confirmText: this.data.$t.common.confirm,
      cancelText: this.data.$t.common.cancel,
      content: this.data.$t.order.cancelProfile,
      success: function(res) {
        if (res.confirm) {
          // WXAPI.orderClose(wx.getStorageSync('token'), orderId).then(function(res) {
          WXAPI.orderClose(getApp().globalData.token, orderId).then(function(res) {
            if (res.code == 0) {
              that.onShow();
            }
          })
        }
      }
    })
  },
  toPayTap: function(e) {
    // 防止连续点击--开始
    if (this.data.payButtonClicked) {
      wx.showToast({
        title: this.data.$t.common.doubleClick,
        icon: 'none'
      })
      return
    }
    this.data.payButtonClicked = true
    setTimeout(() => {
      this.data.payButtonClicked = false
    }, 3000)  // 可自行修改时间间隔（目前是3秒内只能点击一次支付按钮）
    // 防止连续点击--结束
    const that = this;
    const orderId = e.currentTarget.dataset.id;
    let money = e.currentTarget.dataset.money;
    const needScore = e.currentTarget.dataset.score;
    // WXAPI.userAmount(wx.getStorageSync('token')).then(function(res) {
    WXAPI.userAmount(getApp().globalData.token).then(function(res) {
      if (res.code == 0) {
        // 增加提示框
        if (res.data.score < needScore) {
          wx.showToast({
            title: that.data.$t.order.scoreNotEnough,
            icon: 'none'
          })
          return;
        }
        let _msg = that.data.$t.order.amountReal + ' ' + money
        if (res.data.balance > 0) {
          _msg += ' ' + that.data.$t.order.balance + ' ' + res.data.balance
          if (money - res.data.balance > 0) {
            _msg += ' ' + that.data.$t.order.payAmount + ' ' + (money - res.data.balance)
          }          
        }
        if (needScore > 0) {
          _msg += ' ' + that.data.$t.order.payScore + ' ' + needScore
        }
        money = money - res.data.balance
        wx.showModal({
          content: _msg,
          confirmText: that.data.$t.common.confirm,
          cancelText: that.data.$t.common.cancel,
          success: function (res) {
            console.log(res);
            if (res.confirm) {
              that._toPayTap(orderId, money)
            }
          }
        });
      } else {
        wx.showModal({
          confirmText: that.data.$t.common.confirm,
          cancelText: that.data.$t.common.cancel,
          content: that.data.$t.order.noCashAccount,
          showCancel: false
        })
      }
    })
  },
  _toPayTap: function (orderId, money){
    const _this = this
    if (money <= 0) {
      // 直接使用余额支付
      // WXAPI.orderPay(wx.getStorageSync('token'), orderId).then(function (res) {
      WXAPI.orderPay(getApp().globalData.token, orderId).then(function (res) {
        _this.onShow();
      })
    } else {
      this.setData({
        paymentShow: true,
        orderId,
        money,
        nextAction: {
          type: 0,
          id: orderId
        }
      })
    }
  },
  paymentOk(e) {
    console.log(e.detail); // 这里是组件里data的数据
    this.setData({
      paymentShow: false
    })
    wx.redirectTo({
      url: '/package-order/pages/all-orders/index',
    })
  },
  paymentCancel() {
    this.setData({
      paymentShow: false
    })
  },
  onLoad: function() {
    getApp().initLanguage(this)
    wx.setNavigationBarTitle({
      title: this.data.$t.order.title,
    })
  },
  onShow: function() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const options = currentPage.options;
    AUTH.checkHasLogined().then(isLogined => {
      if (isLogined) {
        const activeTab = options && options.activeTab ? options.activeTab : 'all';
        this.setData({
          activeTab: activeTab
        });
        this.doneShow();
        this.filterOrderList()
      } else {
        wx.showModal({
          confirmText: this.data.$t.common.confirm,
          cancelText: this.data.$t.common.cancel,
          content: this.data.$t.auth.needLogin,
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
      }
    })
  },
  async doneShow() {
    wx.showLoading({
      title: '',
    })
    const res = await WXAPI.orderList({
      // token: wx.getStorageSync('token')
      token: getApp().globalData.token
    })
    wx.hideLoading()
    if (res.code == 0) {
      const orderList = res.data.orderList || []
      console.log("all-orders的orderList",orderList)
      if (orderList && orderList.length > 0) {
        orderList.forEach(ele => {
          if (ele.status == 0 ) {
            ele.statusStr = this.data.$t.order.status.st0
          }
          if (ele.status == -1) {
            ele.statusStr = this.data.$t.order.status.st01
          }
          if (ele.status == 1 && ele.isNeedLogistics) {
            ele.statusStr = this.data.$t.order.status.st11
          }
          if (ele.status == 1 && !ele.isNeedLogistics) {
            ele.statusStr = this.data.$t.order.status.st10
          }
          if (ele.status == 2) {
            ele.statusStr = this.data.$t.order.status.st2
          }
          if (ele.status == 3) {
            ele.statusStr = this.data.$t.order.status.st3
          }
        })
      }
      this.setData({
        orderListAll: orderList,
        logisticsMap: res.data.logisticsMap || {},
        goodsMap: res.data.goodsMap || {},
        apiOk: true
      })
      // 根据当前标签过滤一次
      this.filterOrderList()
      
    } else {
      this.setData({
        orderListAll: null,
        orderList: null,
        logisticsMap: {},
        goodsMap: {},
        apiOk: true
      });
    }
  },
  // 顶部标签点击
  onTabChange(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeTab) return
    this.setData({
      activeTab: key
    })
    this.filterOrderList()
  },
  // 根据当前标签过滤订单列表
  filterOrderList() {
    const { activeTab, orderListAll } = this.data
    if (!orderListAll || !orderListAll.length) {
      this.setData({
        orderList: null
      })
      return
    }
    let filtered = orderListAll
    if (activeTab === 'pending') {
      // 待支付：status = 0
      filtered = orderListAll.filter(ele => ele.status == 0)
    } else if (activeTab === 'shipped') {
      // 已发货（配送中）：status = 1 && isNeedLogistics = true
      filtered = orderListAll.filter(ele => ele.status == 1 && ele.isNeedLogistics)
    } else if (activeTab === 'pickup') {
      // 待取餐：status = 1 && isNeedLogistics = false
      filtered = orderListAll.filter(ele => ele.status == 1 && !ele.isNeedLogistics)
    } else if (activeTab === 'finished') {
      // 已完成：status = 3
      filtered = orderListAll.filter(ele => ele.status == 3)
    } else if (activeTab === 'canceled') {
      // 已取消：status = -1
      filtered = orderListAll.filter(ele => ele.status == -1)
    }
    this.setData({
      orderList: filtered.length ? filtered : null
    })
  },
  toIndexPage: function() {
    wx.switchTab({
      url: "/pages/index/index"
    });
  },
  // 删除订单
  deleteOrder: function(e){
    const that = this
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      confirmText: this.data.$t.common.confirm,
      cancelText: this.data.$t.common.cancel,
      content: this.data.$t.order.deleteProfile,
      success: function (res) {
        if (res.confirm) {
          // WXAPI.orderDelete(wx.getStorageSync('token'), id).then(function (res) {  
          WXAPI.orderDelete(getApp().globalData.token, id).then(function (res) {  
            if (res.code == 0) {
              that.onShow(); //重新获取订单列表
            }              
            
          })
        }
      }
    })
  },
  async callShop(e) {
    const shopId = e.currentTarget.dataset.shopid
    const res = await WXAPI.shopSubdetail(shopId)
    if (res.code != 0) {
      wx.showToast({
        title: res.msg,
        icon: 'none'
      })
      return
    }
    wx.makePhoneCall({
      phoneNumber: res.data.info.linkPhone,
    })
  },
})