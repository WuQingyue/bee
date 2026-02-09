const APP = getApp()
const AUTH = require('../../../utils/auth')
const WXAPI = require('apifm-wxapi')
Page({
  data: {
    page: 1,
    peisongType: 'zq', // zq 自取，kd 配送
    showCartPop: false, // 是否显示购物车列表
    showGoodsDetailPOP: false, // 是否显示商品详情
    shopIsOpened: false, // 是否营业
    menuButtonBoundingClientRect: wx.getMenuButtonBoundingClientRect(),

    // 连续滚动模式相关数据
    isContinuousMode: false, // 是否启用连续滚动模式
    scrollTop: 0, // 当前滚动位置
  },  
  onLoad: function (e) {
    getApp().initLanguage(this)
    const _data = {}
    // 读取默认配送方式
    let peisongType = getApp().globalData.peisongType
    if(peisongType){
      this.setData({
        peisongType,
      })
    }
    this.categoriesPromise = this.categories()
  },
  onShow: function(){
    const peisongType = getApp().globalData.peisongType
    if (peisongType) {
      this.setData({
        peisongType
      })
    }
    
    // 根据 peisongType 调整 currentCategory 的辅助函数
    const adjustCategoryByPeisongType = () => {
      const categories = this.data.categories || []
      if (categories.length === 0) {
        return // 分类数据未加载，无法调整
      }
      const hotpotId = Number(getApp().globalData.config.hotpotId) 
      let currentCategory = this.data.currentCategory
      const storedPeisongType = getApp().globalData.peisongType
      // 根据 peisongType 调整分类
      if (storedPeisongType === 'zq' && (!currentCategory || currentCategory.id === hotpotId)) {
        // 自提模式：如果不是第一个分类，切换到第一个
        currentCategory = categories.length > 0 ? categories[0] : null
      } else if (storedPeisongType === 'kd' && (!currentCategory || currentCategory.id !== hotpotId)) {
        // 配送模式：如果不是火锅分类(id=this.data.hotpotId)，切换到火锅分类
        currentCategory = categories.find(cat => cat.id === hotpotId) || null
        
      }
      // 如果分类发生变化，更新相关状态
      if (currentCategory && currentCategory.id !== this.data.currentCategory?.id) {
        const categoryIndex = categories.findIndex(cat => cat.id === currentCategory.id)
        
        this.setData({
          currentCategory,
          categoryIndex: categoryIndex >= 0 ? categoryIndex : 0,
          page: 1
        })
        
        // 保存到本地存储
        getApp().globalData.currentCategory = currentCategory

        // 重新加载商品列表
        this._getGoodsListContinuous && this._getGoodsListContinuous()
      }
    }
    
    // 从其他页面返回时，如果 categories 已完成，直接调用
    if (this.data.currentCategory && this.data.categories && this.data.categories.length > 0) {
      // categories 已完成，先调整分类，再调用 shippingCarInfo
      adjustCategoryByPeisongType()
      this.shippingCarInfo()
    } else if (this.categoriesPromise) {
      // categories 正在执行，等待完成后调用
      this.categoriesPromise.then(() => {
        adjustCategoryByPeisongType()
        this.shippingCarInfo()
      }).catch(() => {
        // 即使失败也尝试调用
        adjustCategoryByPeisongType()
        this.shippingCarInfo()
      })
    } else {
      // 如果 Promise 不存在且分类也未加载，重新调用 categories
      this.categoriesPromise = this.categories().then(() => {
        adjustCategoryByPeisongType()
        this.shippingCarInfo()
      }).catch(() => {
        adjustCategoryByPeisongType()
        this.shippingCarInfo()
      })
    }
    const refreshIndex = getApp().globalData.refreshIndex
    if (refreshIndex) {
      wx.removeStorageSync('refreshIndex')
    }
  },
  async cyTableToken(tableId, key) {
    const res = await WXAPI.cyTableToken(tableId, key)
    if (res.code != 0) {
      wx.showModal({
        confirmText: this.data.$t.common.confirm,
        cancelText: this.data.$t.common.cancel,
        content: res.msg,
        showCancel: false
      })
      return
    }
    wx.hideTabBar()
    getApp().globalData.uid = res.data.uid
    wx.setStorageSync('token', res.data.token)
  },
  async getshopInfo(){
    let shopInfo = getApp().globalData.shopInfo
    if (shopInfo) {
      this.setData({
        shopInfo: shopInfo,
        shopIsOpened: this.checkIsOpened(shopInfo.openingHours)
      })
      this.categories()
      return
    }
    wx.getLocation({
      type: 'wgs84', //wgs84 返回 gps 坐标，gcj02 返回可用于 wx.openLocation 的坐标
      success: (res) => {
        // console.log(res)
        this.data.latitude = res.latitude
        this.data.longitude = res.longitude
        this.fetchShops(res.latitude, res.longitude, '')
      },      
      fail: (e) => {
        console.log(e);
        if (e.errMsg.indexOf('fail auth deny') != -1) {
          AUTH.checkAndAuthorize('scope.userLocation')
        } else if (e.errMsg.indexOf('fail privacy permission is not authorized') != -1) {
          wx.showModal({
            confirmText: this.data.$t.common.confirm,
            cancelText: this.data.$t.common.cancel,
            content: this.data.$t.common.privacyPermission,
            showCancel: false,
            success: () => {
              wx.reLaunch({
                url: '/package-index/pages/index/index',
              })
            }
          })
        } else {
          wx.showModal({
            confirmText: this.data.$t.common.confirm,
            cancelText: this.data.$t.common.cancel,
            content: e.errMsg,
            showCancel: false
          })
        }
      }
    })
  },

  async fetchShops(latitude, longitude, kw){
    const res = await WXAPI.fetchShops({
      curlatitude: latitude,
      curlongitude: longitude,
      nameLike: kw,
      pageSize: 1
    })
    if (res.code != 0) {
      wx.showModal({
        content: this.data.$t.common.empty,
        confirmText: this.data.$t.common.confirm,
        cancelText: this.data.$t.common.cancel,
        showCancel: false
      })
      return
    }
    res.data.forEach(ele => {
      ele.distance = ele.distance.toFixed(1) // 距离保留3位小数
    })
    this.setData({
      shopInfo: res.data[0],
      shopIsOpened: this.checkIsOpened(res.data[0].openingHours)
    })
    getApp().globalData.shopInfo =  res.data[0]
    this.categories()
  },
  changePeisongType(e) {
    const peisongType = e.currentTarget.dataset.type
    this.setData({
      peisongType
    })
    getApp().globalData.peisongType = peisongType
  },
  // 获取分类
  async categories() {
    // https://www.yuque.com/apifm/nu0f75/racmle
    const res = await WXAPI.goodsCategory()
    if (res.code != 0) {
      wx.showToast({
        title: res.msg,
        icon: 'none'
      })
      return
    }
    const categories = res.data
    const currentCategory = categories.length > 0 ? categories[0] : null
    console.log("categories",categories)
    this.setData({
      page: 1,
      categories: res.data,
      categoryIndex: 0,
      currentCategory: currentCategory // 初始化 currentCategory
    })
    // 保存到本地存储，供其他页面使用
    if (currentCategory) {
      getApp().globalData.currentCategory = currentCategory
    }
    this.data.page = 1
    await this._getGoodsListContinuous()
  },
  async getGoodsList() {
    if (!this.data.isContinuousMode) {
      // 原有的单分类模式
      this._getGoodsListSingleCategory()
      return
    }

    // 连续滚动模式
    await this._getGoodsListContinuous()
  },

  // 原有的单分类商品加载逻辑
  async _getGoodsListSingleCategory() {
    wx.showLoading({
      title: '',
    })
    // https://www.yuque.com/apifm/nu0f75/wg5t98
    const res = await WXAPI.goodsv2({
      page: this.data.page,
      categoryId: this.data.currentCategory.id,
      pageSize: 5
    })
    wx.hideLoading()
    if (res.code == 700) {
      if (this.data.page == 1) {
        this.setData({
          goods: null
        })
      }
      else {
        wx.showToast({
          title: '已经到底啦',
          icon: 'none'
        })
      }
      return
    }
    if (res.code != 0) {
      wx.showToast({
        title: res.msg,
        icon: 'none'
      })
      return
    }
    if (this.data.page == 1) {
      this.setData({
        goods: res.data.result
      })
    } else {
      this.setData({
        goods: this.data.goods.concat(res.data.result)
      })
    }
    this.processBadge()
  },

  // 连续滚动模式的商品加载逻辑
  async _getGoodsListContinuous() {
    wx.showLoading({
      title: '',
    })

    let currentCategory = this.data.currentCategory
    let allGoods = this.data.goods || []

    // 如果是首次加载，重置数据
    if (this.data.page == 1) {
      allGoods = []
    }

    // 循环加载所有分类的商品
    const res = await WXAPI.goodsv2({
      page: 1, // 每个分类都从第一页开始
      categoryId: currentCategory.id,
      pageSize: 5
    })

    if (res.code == 0 && res.data.result && res.data.result.length > 0) {
        // 添加到总商品列表
        allGoods = allGoods.concat(res.data.result)
      }
    wx.hideLoading()

    this.setData({
      goods: allGoods,
    })

    console.log('商品数据加载完成:', allGoods)
    this.processBadge()
  },

  _onReachBottom() {
    if (!this.data.isContinuousMode) {
      // 原有的单分类模式
      this.data.page++
      this.getGoodsList()
      return
    }

    // 连续滚动模式：继续加载更多分类的商品
    this._loadMoreCategories()
  },

  // 连续滚动模式下加载更多分类的商品
  async _loadMoreCategories() {
    const currentCategory = this.data.currentCategory
    let allGoods = this.data.goods || []

    wx.showLoading({
      title: '',
    })

    const res = await WXAPI.goodsv2({
        page: this.data.page,
        categoryId: currentCategory.id,
        pageSize: 5
      })

    allGoods = allGoods.concat(res.data.result)

    wx.hideLoading()

    this.setData({
      goods: allGoods,
    })

    this.processBadge()
  },

  // 滚动事件监听
  onScroll(e) {
    if (!this.data.isContinuousMode) {
      return
    }

    const scrollTop = e.detail.scrollTop
    this.setData({
      scrollTop: scrollTop
    })

    // 计算当前滚动到的分类
  },

  // 计算当前滚动位置对应的分类 已注释
  _calculateCurrentCategory(scrollTop) {
    const goodsByCategory = this.data.goodsByCategory
    if (!goodsByCategory || goodsByCategory.length === 0) {
      return
    }

    // 更准确的估算值（rpx转px，微信小程序中1rpx = 0.5px在大多数设备上）
    const itemHeight = 100 // 
    const headerHeight = 0 // banner等已注释

    // 计算当前可见区域的商品索引
    const visibleStartIndex = Math.max(0, Math.floor((scrollTop - headerHeight) / itemHeight))
    // 找到对应的分类（在 goodsByCategory 中）
    let matchedCategory = null
    for (let i = 0; i < goodsByCategory.length; i++) {
      const category = goodsByCategory[i]
      if (visibleStartIndex >= category.startIndex && visibleStartIndex <= category.endIndex) {
        matchedCategory = category
        break
      }
    }

    // 如果滚动到了最后，使用最后一个分类
    if (!matchedCategory && goodsByCategory.length > 0) {
      if (visibleStartIndex >= goodsByCategory[goodsByCategory.length - 1].endIndex) {
        matchedCategory = goodsByCategory[goodsByCategory.length - 1]
      }
    }
    // ⭐ 关键修复：根据 categoryId 在 subCategories 中找到对应的索引
    const subCategories = this.data.subCategories
    let level2CategoryIndex = 0
    if (matchedCategory) {
      const foundIndex = subCategories.findIndex(cat => cat.id === matchedCategory.categoryId)
      if (foundIndex >= 0) {
        level2CategoryIndex = foundIndex  // 这是 subCategories 的索引
      } else {
        return
      }
    }
    // 更新当前分类索引
    if (level2CategoryIndex !== this.data.level2CategoryIndex) {
      this.setData({
        level2CategoryIndex: level2CategoryIndex
      })
    }
  },

  categoryClick(e) {
    const index = e.currentTarget.dataset.idx
    const hotpotId = Number(getApp().globalData.config.hotpotId)
    if (!this.data.isContinuousMode) {
      // 原有的单分类模式
      const currentCategory = this.data.categories[index]
      // peisongType
      if(currentCategory.id == hotpotId){
        this.setData({
          peisongType:'kd'
        })
      } else{
        this.setData({
          peisongType:'zq'
        })
      }
      getApp().globalData.peisongType = this.data.peisongType
      getApp().globalData.currentCategory = currentCategory
      this.setData({
        page: 1,
        currentCategory,
        categoryIndex:index,
        scrolltop: 0
      })
      this.getGoodsList()
      this.shippingCarInfo()
      return
    }

    // 连续滚动模式：滚动到对应分类的第一个商品
    this._scrollToCategory(index)
  },
  
  // 滚动到指定分类的第一个商品  已注释
  _scrollToCategory(level2CategoryIndex) {
    if (!goodsByCategory || goodsByCategory.length === 0) {
      return
    }
    const subCategories = this.data.subCategories
    if (!subCategories || level2CategoryIndex >= subCategories.length) {
      return
    }
    const targetSubCategory = subCategories[level2CategoryIndex]

    // 在 goodsByCategory 中查找对应的分类
    const category = goodsByCategory.find(cat => cat.categoryId === targetSubCategory.id)

    if (!category) {
      return
    }

    // 估算滚动位置：商品索引 * 商品高度 + 头部高度
    const itemHeight = 100
    const headerHeight = 0 // banner等已注释
    const scrollTop = category.startIndex * itemHeight + headerHeight

    this.setData({
      scrollTop: scrollTop,
      level2CategoryIndex:level2CategoryIndex
    })

  },
  async shippingCarInfo() {
    let res = null
    const hotpotId = Number(getApp().globalData.config.hotpotId)
    if(this.data.currentCategory.id == hotpotId){
      res = await WXAPI.shippingCarInfo(getApp().globalData.token,"delivery")
    }
    else {
      res = await WXAPI.shippingCarInfo(getApp().globalData.token,"self-pickup")
    }
    if (res.code == 0) {
      this.setData({
        shippingCarInfo: res.data
      })
    } else {
      this.setData({
        shippingCarInfo: null,
        showCartPop: false
      })
    }
    

    this.processBadge()
  },
  showCartPop() {
    if (this.data.scanDining) {
      // 扫码点餐，前往购物车页面
      wx.navigateTo({
        url: '/package-pay/pages/cart/index',
      })
    } else {
      this.setData({
        showCartPop: !this.data.showCartPop
      })
    }
  },
  hideCartPop() {
    this.setData({
      showCartPop: false
    })
  },
  async addCart1(e) {
    const token = getApp().globalData.token
    const index = e.currentTarget.dataset.idx
    console.log("点击的商品",index)
    const item = this.data.goods[index]
    wx.showLoading({
      title: '',
    })

    let number = item.minBuyNumber // 加入购物车的数量

    if (this.data.shippingCarInfo && this.data.shippingCarInfo.items) {
      const goods = this.data.shippingCarInfo.items.find(ele => { return ele.goodsId == item.id})
      console.log(goods);
      if (goods) {
        number = 1
      }
    }
    
    let res = null
    const hotpotId = Number(getApp().globalData.config.hotpotId)
    if(this.data.currentCategory.id == hotpotId){
      res = await WXAPI.shippingCarInfoAddItem(token, item.id, number, [], [], "delivery")
    }
    else {
      res = await WXAPI.shippingCarInfoAddItem(token, item.id, number, [], [], "self-pickup")
    }
    
    wx.hideLoading()
    if (res.code == 2000) {
      AUTH.login(this)
      return
    }
    if (res.code != 0) {
      wx.showToast({
        title: res.msg,
        icon: 'non  e'
      })
      return
    }
    this.shippingCarInfo()
  },
  async skuClick(e) {
    const index1 = e.currentTarget.dataset.idx1
    const index2 = e.currentTarget.dataset.idx2
    const curGoodsMap = this.data.curGoodsMap
    curGoodsMap.properties[index1].childsCurGoods.forEach(ele => {
      ele.selected = false
    })
    curGoodsMap.properties[index1].childsCurGoods[index2].selected = true
    this.setData({
      curGoodsMap
    })
    this.calculateGoodsPrice()
  },
  async calculateGoodsPrice() {
    const curGoodsMap = this.data.curGoodsMap
    // 计算最终的商品价格
    let price = curGoodsMap.basicInfo.minPrice
    let originalPrice = curGoodsMap.basicInfo.originalPrice
    let totalScoreToPay = curGoodsMap.basicInfo.minScore
    let buyNumMax = curGoodsMap.basicInfo.stores
    let buyNumber = curGoodsMap.basicInfo.minBuyNumber
    if (this.data.shopType == 'toPingtuan') {
      price = curGoodsMap.basicInfo.pingtuanPrice
    }
    // 计算 sku 价格
    const canSubmit = this.skuCanSubmit()
    if (canSubmit) {
      let propertyChildIds = "";
      if (curGoodsMap.properties) {
        curGoodsMap.properties.forEach(big => {
          const small = big.childsCurGoods.find(ele => {
            return ele.selected
          })
          propertyChildIds = propertyChildIds + big.id + ":" + small.id + ","
        })
      }
      const res = await WXAPI.goodsPrice(curGoodsMap.basicInfo.id, propertyChildIds)
      if (res.code == 0) {
        price = res.data.price
        if (this.data.shopType == 'toPingtuan') {
          price = res.data.pingtuanPrice
        }
        originalPrice = res.data.originalPrice
        totalScoreToPay = res.data.score
        buyNumMax = res.data.stores
      }
    }
    // 计算时段定价的价格
    if (this.data.goodsTimesSchedule) {
      const a = this.data.goodsTimesSchedule.find(ele => ele.active)
      if (a) {
        const b = a.items.find(ele => ele.active)
        if (b) {
          price = b.price
          buyNumMax = b.stores
        }
      }
    }
    // 计算配件价格
    if (this.data.goodsAddition) {
      this.data.goodsAddition.forEach(big => {
        big.items.forEach(small => {
          if (small.active) {
            price = (price*100 + small.price*100) / 100
          }
        })
      })
    }
    curGoodsMap.price = price
    this.setData({
      curGoodsMap,
      buyNumMax
    });
  },
  async skuClick2(e) {
    const propertyindex = e.currentTarget.dataset.idx1
    const propertychildindex = e.currentTarget.dataset.idx2

    const goodsAddition = this.data.goodsAddition
    const property = goodsAddition[propertyindex]
    const child = property.items[propertychildindex]
    if (child.active) {
      // 该操作为取消选择
      child.active = false
      this.setData({
        goodsAddition
      })
      this.calculateGoodsPrice()
      return
    }
    // 单选配件取消所有子栏目选中状态
    if (property.type == 0) {
      property.items.forEach(child => {
        child.active = false
      })
    }
    // 设置当前选中状态
    child.active = true
    this.setData({
      goodsAddition
    })
    this.calculateGoodsPrice()
  },
  skuCanSubmit() {
    const curGoodsMap = this.data.curGoodsMap
    let canSubmit = true
    if (curGoodsMap.properties) {
      curGoodsMap.properties.forEach(big => {
        const small = big.childsCurGoods.find(ele => {
          return ele.selected
        })
        if (!small) {
          canSubmit = false
        }
      })
    }
    if (this.data.goodsTimesSchedule) {
      const a = this.data.goodsTimesSchedule.find(ele => ele.active)
      if (!a) {
        canSubmit = false
      } else {
        const b = a.items.find(ele => ele.active)
        if (!b) {
          canSubmit = false
        }
      }
    }
    return canSubmit
  },
  additionCanSubmit() {
    const curGoodsMap = this.data.curGoodsMap
    let canSubmit = true
    if (curGoodsMap.basicInfo.hasAddition) {
      this.data.goodsAddition.forEach(ele => {
        if (ele.required) {
          const a = ele.items.find(item => {return item.active})
          if (!a) {
            canSubmit = false
          }
        }
      })
    }
    return canSubmit
  },
  async addCart2() {
    const token = getApp().globalData.token
    const curGoodsMap = this.data.curGoodsMap
    const canSubmit = this.skuCanSubmit()
    const additionCanSubmit = this.additionCanSubmit()
    if (!canSubmit || !additionCanSubmit) {
      wx.showToast({
        title: this.data.$t.goodsDetail.noSelectSku,
        icon: 'none'
      })
      return
    }
    const sku = []
    if (curGoodsMap.properties) {
      curGoodsMap.properties.forEach(big => {
        const small = big.childsCurGoods.find(ele => {
          return ele.selected
        })
        sku.push({
          optionId: big.id,
          optionValueId: small.id
        })
      })
    }
    const goodsAddition = []
    if (this.data.goodsAddition) {
      this.data.goodsAddition.forEach(ele => {
        ele.items.forEach(item => {
          if (item.active) {
            goodsAddition.push({
              id: item.id,
              pid: item.pid
            })
          }
        })
      })
    }
    wx.showLoading({
      title: '',
    })
   
    let d = null
    const hotpotId = Number(getApp().globalData.config.hotpotId)
    if(this.data.currentCategory.id == hotpotId){
      d = {
        token,
        goodsId: curGoodsMap.basicInfo.id,
        number: curGoodsMap.number,
        sku: sku && sku.length > 0 ? JSON.stringify(sku) : '',
        addition: goodsAddition && goodsAddition.length > 0 ? JSON.stringify(goodsAddition) : '',
        type: "delivery"
      }
    }
    else {
      d = {
        token,
        goodsId: curGoodsMap.basicInfo.id,
        number: curGoodsMap.number,
        sku: sku && sku.length > 0 ? JSON.stringify(sku) : '',
        addition: goodsAddition && goodsAddition.length > 0 ? JSON.stringify(goodsAddition) : '',
        type: "self-pickup"
      }
    }

    if (this.data.goodsTimesSchedule) {
      const a = this.data.goodsTimesSchedule.find(ele => ele.active)
      if (a) {
        const b = a.items.find(ele => ele.active)
        if (b) {
          d.goodsTimesDay = a.day
          d.goodsTimesItem = b.name
        }
      }
    }
    console.log("addCart2的currentCategory",this.data.currentCategory.id)
    
    const res = await WXAPI.shippingCarInfoAddItemV2(d)
    wx.hideLoading()
    if (res.code == 2000) {
      this.hideGoodsDetailPOP()
      AUTH.login(this)
      return
    }
    if (res.code != 0) {
      wx.showToast({
        title: res.msg,
        icon: 'none'
      })
      return
    }
    this.hideGoodsDetailPOP()
    this.shippingCarInfo()
  },
  async cartStepChange(e) {
    const token = getApp().globalData.token
    console.log("进入了移除商品")
    const index = e.currentTarget.dataset.idx
    const item = this.data.shippingCarInfo.items[index]
    const currentCategory = this.data.currentCategory
    console.log("currentCategory",currentCategory)
    if (e.detail < 1) {
      // 删除商品
      wx.showLoading({
        title: '',
      })
      let res = null
      const hotpotId = Number(getApp().globalData.config.hotpotId)
      if(currentCategory.id == hotpotId){
        res = await WXAPI.shippingCarInfoRemoveItem(token, item.key, "delivery")
      }
      else {
        res = await WXAPI.shippingCarInfoRemoveItem(token, item.key, "self-pickup")
      }
      wx.hideLoading()
      if (res.code == 700) {
        this.setData({
          shippingCarInfo: null,
          showCartPop: false
        })
      } else if (res.code == 0) {
        this.setData({
          shippingCarInfo: res.data
        })
      } else {
        this.setData({
          shippingCarInfo: null,
          showCartPop: false
        })
      }
      this.processBadge()
    } else {
      // 修改数量
      wx.showLoading({
        title: '',
      })
      let res = null
      const hotpotId = Number(getApp().globalData.config.hotpotId)
      if(currentCategory.id == hotpotId){
        res = await WXAPI.shippingCarInfoModifyNumber(token, item.key, e.detail, "delivery")
      }
      else {
        res = await WXAPI.shippingCarInfoModifyNumber(token, item.key, e.detail, "self-pickup")
      }
      wx.hideLoading()
      if (res.code != 0) {
        wx.showToast({
          title: res.msg,
          icon: 'none'
        })
        return
      }
      this.shippingCarInfo()
    }
  },
  goodsStepChange(e) {
    const curGoodsMap = this.data.curGoodsMap
    curGoodsMap.number = e.detail
    this.setData({
      curGoodsMap
    })
  },
  async clearCart() {
    wx.showLoading({
      title: '',
    })
    console.log("清空购物车")
    console.log("currentCategory",this.data.currentCategory)
    let res = null
    const hotpotId = Number(getApp().globalData.config.hotpotId)
    if(this.data.currentCategory.id == hotpotId){
      res = await WXAPI.shippingCarInfoRemoveAll(getApp().globalData.token,"delivery")
    }
    else {
      res = await WXAPI.shippingCarInfoRemoveAll(getApp().globalData.token,"self-pickup")
    }
    wx.hideLoading()
    if (res.code != 0) {
      wx.showToast({
        title: res.msg,
        icon: 'none'
      })
      return
    }
    this.shippingCarInfo()
  },
  async showGoodsDetailPOP(e) {
    const index = e.currentTarget.dataset.idx
    const goodsId = this.data.goods[index].id
    this._showGoodsDetailPOP(goodsId)
    this.goodsAddition(goodsId)
    this._goodsTimesSchedule(goodsId)
  },
  async _showGoodsDetailPOP(goodsId) {
    const res = await WXAPI.goodsDetail(goodsId)
    if (res.code != 0) {
      wx.showToast({
        title: res.msg,
        icon: 'none'
      })
      return
    }
    wx.hideTabBar()
    res.data.price = res.data.basicInfo.minPrice
    res.data.number = res.data.basicInfo.minBuyNumber
    this.setData({
      curGoodsMap: res.data,
      showGoodsDetailPOP: true
    })
  },
  hideGoodsDetailPOP() {
    this.setData({
      showGoodsDetailPOP: false
    })
    if (!this.data.scanDining) {
      wx.showTabBar()
    }
  },
  goPay() {
    // 检查购物车是否为空
    if (!this.data.shippingCarInfo || !this.data.shippingCarInfo.number || this.data.shippingCarInfo.number === 0) {
      // 购物车为空，不执行任何操作
      return
    }
    
    // 支付前把当前一级分类写入本地，供支付页使用
    if (this.data.currentCategory) {
      getApp().globalData.currentCategory = this.data.currentCategory
    }
    if(this.data.peisongType){
      getApp().globalData.peisongType = this.data.peisongType
      console.log("this.data.peisongType",this.data.peisongType)
    }
    if (this.data.scanDining) {
      // 扫码点餐，前往购物车
      wx.navigateTo({
        url: '/package-pay/pages/cart/index',
      })
    } else {
      wx.navigateTo({
        url: '/package-pay/pages/pay/index',
      })
    }
  },
  onShareAppMessage: function() {
    let uid = getApp().globalData.uid
    if (!uid) {
      uid = ''
    }
    let path = '/package-index/pages/index/index?inviter_id=' + uid
    return {
      title: '"' +  getApp().globalData.config.mallName + '" ' +  getApp().globalData.config.share_profile,
      path
    }
  },
  couponOverlayClick() {
    this.setData({
      showCouponPop: false
    })
  },
  couponImageClick() {
    wx.navigateTo({
      url: '/package-other/pages/coupons/index',
    })
  },
  async noticeLastOne() {
    const res = await WXAPI.noticeLastOne()
    if (res.code == 0) {
      this.setData({
        noticeLastOne: res.data
      })
    }
  },
  goNotice(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/package-other/pages/notice/detail?id=' + id,
    })
  },
  async banners() {
    // https://www.yuque.com/apifm/nu0f75/ms21ki
    const res = await WXAPI.banners({
      type: 'diancang'
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
  checkIsOpened(openingHours) {
    if (!openingHours) {
      return true
    }
    const date = new Date();
    const startTime = openingHours.split('-')[0]
    const endTime = openingHours.split('-')[1]
    const dangqian=date.toLocaleTimeString('chinese',{hour12:false})
    
    const dq=dangqian.split(":")
    const a = startTime.split(":")
    const b = endTime.split(":")

    const dqdq=date.setHours(dq[0],dq[1])
    const aa=date.setHours(a[0],a[1])
    const bb=date.setHours(b[0],b[1])

    if (a[0]*1 > b[0]*1) {
      // 说明是到第二天
      return !this.checkIsOpened(endTime + '-' + startTime)
    }
    return aa<dqdq && dqdq<bb
  },
  async goodsAddition(goodsId){
    const res = await WXAPI.goodsAddition(goodsId)
    if (res.code == 0) {
      this.setData({
        goodsAddition: res.data
      })
    } else {
      this.setData({
        goodsAddition: null
      })
    }
  },
  tabbarChange(e) {
    if (e.detail == 1) {
      wx.navigateTo({
        url: '/package-pay/pages/cart/index',
      })
    }
    if (e.detail == 2) {
      wx.navigateTo({
        url: '/package-pay/pages/cart/order',
      })
    }
  },
  // 显示分类和商品数量徽章
  processBadge() {
    const goods = this.data.goods
    const shippingCarInfo = this.data.shippingCarInfo
    if (!goods) {
      return
    }
    goods.forEach(ele => {
      ele.badge = 0
    })
    if (shippingCarInfo) {
      shippingCarInfo.items.forEach(ele => {
        if (ele.goodsId) {
          const _goods = goods.find(a => {
            return a.id == ele.goodsId
          })
          if (_goods) {
            _goods.badge += ele.number
          }
        }
      })
    }

    this.setData({
      goods
    })
  },
  selectshop() {
    wx.navigateTo({
      url: '/package-shop/pages/shop/select?type=index',
    })
  },
  goGoodsDetail(e) {
    const index = e.currentTarget.dataset.idx
    const goodsId = this.data.goods[index].id
    wx.navigateTo({
      url: '/package-goods/pages/goods-details/index?id=' + goodsId,
    })
  },
  async _goodsTimesSchedule(goodsId) {
    const res = await WXAPI.goodsTimesSchedule(goodsId, '') // todo sku
    if (res.code == 0) {
      const goodsTimesSchedule = res.data
      res.data.forEach(ele => {
        ele.active = false
      })
      goodsTimesSchedule[0].active = true
      goodsTimesSchedule[0].items[0].active = true
      this.setData({
        goodsTimesSchedule
      })
      this.calculateGoodsPrice()
    } else {
      this.setData({
        goodsTimesSchedule: null
      })
    }
  },
  async skuClick3(e) {
    const propertyindex = e.currentTarget.dataset.idx1
    const propertychildindex = e.currentTarget.dataset.idx2

    const goodsTimesSchedule = this.data.goodsTimesSchedule
    const property = goodsTimesSchedule[propertyindex]
    const child = property.items[propertychildindex]
    if (child.stores <= 0) {
      wx.showToast({
        title: this.data.$t.goodsDetail.noStores,
        icon: 'none'
      })
      return
    }
    goodsTimesSchedule.forEach(a => {
      a.active = false
      a.items.forEach(b => {
        b.active = false
      })
    })
    property.active = true
    child.active = true
    this.setData({
      goodsTimesSchedule
    })
    this.calculateGoodsPrice()
  },
  waimai() {
    wx.clearStorageSync()
    wx.showTabBar()
    wx.reLaunch({
      url: '/package-index/pages/index/index',
    })
  },
})
