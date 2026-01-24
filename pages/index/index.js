const APP = getApp()
const AUTH = require('../../utils/auth')
const WXAPI = require('apifm-wxapi')
Page({
  data: {
    page: 1,
    peisongType: 'zq', // zq 自取，kd 配送
    showCartPop: false, // 是否显示购物车列表
    showGoodsDetailPOP: false, // 是否显示商品详情
    showCouponPop: false, // 是否弹出优惠券领取提示
    shopIsOpened: false, // 是否营业

    showPingtuanPop: false,
    share_goods_id: undefined,
    share_pingtuan_open_id: undefined,
    lijipingtuanbuy: false,
    pingtuan_open_id: undefined,
    menuButtonBoundingClientRect: wx.getMenuButtonBoundingClientRect(),

    // 连续滚动模式相关数据
    isContinuousMode: true, // 是否启用连续滚动模式
    level1CategoryIndex: 0, // 当前激活的分类索引
    goodsByCategory: [], // 按分类分组的商品数据，用于跟踪每个分类的商品范围
    scrollTop: 0, // 当前滚动位置
    level2CategoryIndex: 0, // 当前滚动到的分类索引
  },  
  onLoad: function (e) {
    getApp().initLanguage(this)
    const _data = {}
    // 测试拼团入口
    // e = {
    //   share_goods_id: 521055,
    //   share_pingtuan_open_id: 11267
    // }

    // 测试扫码点餐
    // shopId=36,id=111,key=Y6RoIT 进行 url编码，3个值分别为 门店id，餐桌id，餐桌密钥
    // e = {
    //   scene: 'shopId%3d12879%2cid%3d111%2ckey%3dY6RoIT' 
    // }

    // let mod = 0 // 0 普通模式； 1 扫码点餐模式
    // if (e && e.scene) {
    //   const scene = decodeURIComponent(e.scene) // 处理扫码进商品详情页面的逻辑
    //   if (scene && scene.split(',').length == 3) {
    //     // 扫码点餐
    //     const scanDining = {}
    //     if (scene.indexOf('key=') != -1) {
    //       // 原来shopId=36,id=111,key=Y6RoIT的参数
    //       scene.split(',').forEach(ele => {
    //         scanDining[ele.split('=')[0]] = ele.split('=')[1]
    //       })
    //     } else {
    //       // 新的 1007292,1015,zsT1U3 模式
    //       const _scene = scene.split(',')
    //       scanDining.shopId = _scene[0]
    //       scanDining.id = _scene[1]
    //       scanDining.key = _scene[2]
    //     }
        
    //     wx.setStorageSync('scanDining', scanDining)
    //     _data.scanDining = scanDining
    //     this.cyTableToken(scanDining.id, scanDining.key)
    //     mod = 1
    //   } else {
    //     wx.removeStorageSync('scanDining')
    //   }
    // }
    // if (wx.getStorageSync('scanDining')) {
    //   mod = 1
    //   _data.scanDining = wx.getStorageSync('scanDining')
    //   wx.hideTabBar()
    // }
    // this.setData(_data)
    // if (e.share_goods_id) {
    //   this.data.share_goods_id = e.share_goods_id
    //   this._showGoodsDetailPOP(e.share_goods_id)
    // }
    // if (e.share_pingtuan_open_id) {
    //   this.data.share_pingtuan_open_id = e.share_pingtuan_open_id
    // } else {
    //   this._showCouponPop()
    // }
    // 静默式授权注册/登陆
    // if (mod == 0) {
    //   AUTH.checkHasLogined().then(isLogin => {
    //     if (isLogin) {
    //       AUTH.bindSeller()
    //     } else {
    //       AUTH.authorize().then(res => {
    //         AUTH.bindSeller()
    //       })
    //     }
    //   })
    // }
    // 设置标题
    // const mallName = wx.getStorageSync('mallName')
    // if (mallName) {
    //   this.setData({
    //     mallName
    //   })
    //   wx.setNavigationBarTitle({
    //     title: mallName
    //   })
    // }
    // APP.configLoadOK = () => {
    //   const mallName = wx.getStorageSync('mallName')
    //   if (mallName) {
    //     wx.setNavigationBarTitle({
    //       title: mallName
    //     })
    //   }
    // }
    // 读取默认配送方式
    let peisongType = wx.getStorageSync('peisongType')
    this.setData({
      peisongType
    })
    // this.noticeLastOne()
    // this.getshopInfo()
    this.categoriesPromise = this.categories()
    // this.banners()
  },
  onShow: function(){
    const peisongType = wx.getStorageSync('peisongType')
    if (peisongType) {
      this.setData({
        peisongType
      })
    }
    
    // 根据 peisongType 调整 currentLevel1Category 的辅助函数
    const adjustCategoryByPeisongType = () => {
      const level1Categories = this.data.level1Categories || []
      if (level1Categories.length === 0) {
        return // 分类数据未加载，无法调整
      }
      
      let currentLevel1Category = this.data.currentLevel1Category
      const storedPeisongType = wx.getStorageSync('peisongType')
      
      // 根据 peisongType 调整分类
      if (storedPeisongType === 'zq' && (!currentLevel1Category || currentLevel1Category.id === 559239)) {
        // 自提模式：如果不是第一个分类，切换到第一个
        currentLevel1Category = level1Categories.length > 0 ? level1Categories[0] : null
      } else if (storedPeisongType === 'kd' && (!currentLevel1Category || currentLevel1Category.id !== 559239)) {
        // 配送模式：如果不是火锅分类(id=559239)，切换到火锅分类
        currentLevel1Category = level1Categories.find(cat => cat.id === 559239) || currentLevel1Category
      }
      
      // 如果分类发生变化，更新相关状态
      if (currentLevel1Category && currentLevel1Category.id !== this.data.currentLevel1Category?.id) {
        const level2Categories = this.data.level2Categories || []
        const subCategories = level2Categories.filter(cat => cat.key === String(currentLevel1Category.id))
        const level1CategoryIndex = level1Categories.findIndex(cat => cat.id === currentLevel1Category.id)
        
        this.setData({
          currentLevel1Category,
          level1CategoryIndex: level1CategoryIndex >= 0 ? level1CategoryIndex : 0,
          level2CategoryIndex: 0,
          subCategories,
          page: 1,
          goodsByCategory: []
        })
        
        // 保存到本地存储
        wx.setStorageSync('currentLevel1Category', currentLevel1Category)
        
        // 重新加载商品列表
        this._getGoodsListContinuous && this._getGoodsListContinuous()
      }
    }
    
    // 从其他页面返回时，如果 categories 已完成，直接调用
    if (this.data.currentLevel1Category && this.data.level1Categories && this.data.level1Categories.length > 0) {
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
    const refreshIndex = wx.getStorageSync('refreshIndex')
    if (refreshIndex) {
      this.getshopInfo()
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
    wx.setStorageSync('uid', res.data.uid)
    wx.setStorageSync('token', res.data.token)
  },
  async getshopInfo(){
    let shopInfo = wx.getStorageSync('shopInfo')
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
                url: '/pages/index/index',
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
    wx.setStorageSync('shopInfo', res.data[0])
    this.categories()
  },
  async _showCouponPop() {
    const a = wx.getStorageSync('has_pop_coupons')
    if (a) {
      return
    }
    // 检测是否需要弹出优惠券的福袋
    const res = await WXAPI.coupons({
      token: wx.getStorageSync('token')
    })
    if (res.code == 0) {
      this.data.showCouponPop = true
      wx.setStorageSync('has_pop_coupons', true)
    } else {
      this.data.showCouponPop = false
    }
    this.setData({
      showCouponPop: this.data.showCouponPop
    })
  },
  changePeisongType(e) {
    const peisongType = e.currentTarget.dataset.type
    this.setData({
      peisongType
    })
    wx.setStorageSync('peisongType', peisongType)
  },
  // 获取分类
  async categories() {
    // const shopInfo = wx.getStorageSync('shopInfo')
    // const shop_goods_split = wx.getStorageSync('shop_goods_split')
    // let shopId = '0'
    // if (shopInfo) {
    //   shopId = '0,' + shopInfo.id
    // }
    // if (shop_goods_split != '1') {
    //   shopId = ''
    // }
    // https://www.yuque.com/apifm/nu0f75/racmle
    // const res = await WXAPI.goodsCategoryV2(shopId)
    const res = await WXAPI.goodsCategory()
    if (res.code != 0) {
      wx.showToast({
        title: res.msg,
        icon: 'none'
      })
      return
    }
    // 过滤出类别
    const level1Categories = res.data.filter(item => item.level == 1)
    const level2Categories = res.data.filter(item => item.level == 2)
    const subCategories = level2Categories.filter(cat => cat.key === String(res.data[0].id));
    // 初始化时设置 currentLevel1Category 为第一个一级分类
    const currentLevel1Category = level1Categories.length > 0 ? level1Categories[0] : null
    this.setData({
      page: 1,
      // categories: res.data,
      level1Categories: level1Categories,
      level2Categories: level2Categories,
      subCategories: subCategories,
      categorySelected: res.data[0],
      level1CategoryIndex: 0,
      level2CategoryIndex: 0, // 初始化为第一个分类
      goodsByCategory: [],
      currentLevel1Category: currentLevel1Category // 初始化 currentLevel1Category
    })
    // 保存到本地存储，供其他页面使用
    if (currentLevel1Category) {
      wx.setStorageSync('currentLevel1Category', currentLevel1Category)
    }
    // if (shop_goods_split == '1') {
    //   wx.setStorageSync('shopIds', shopInfo.id)
    // } else {
    //   wx.removeStorageSync('shopIds')
    // }
    this.data.page = 1
    // this.getGoodsList()
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
  // async _getGoodsListSingleCategory() {
  //   wx.showLoading({
  //     title: '',
  //   })
  //   // https://www.yuque.com/apifm/nu0f75/wg5t98
  //   const res = await WXAPI.goodsv2({
  //     page: this.data.page,
  //     categoryId: this.data.categorySelected.id,
  //     pageSize: 10000
  //   })
  //   wx.hideLoading()
  //   if (res.code == 700) {
  //     if (this.data.page == 1) {
  //       this.setData({
  //         goods: null
  //       })
  //     }
  //     return
  //   }
  //   if (res.code != 0) {
  //     wx.showToast({
  //       title: res.msg,
  //       icon: 'none'
  //     })
  //     return
  //   }
  //   res.data.result.forEach(ele => {
  //     if (ele.miaosha) {
  //       // 秒杀商品，显示倒计时
  //       const _now = new Date().getTime()
  //       ele.dateStartInt = new Date(ele.dateStart.replace(/-/g, '/')).getTime() - _now
  //       ele.dateEndInt = new Date(ele.dateEnd.replace(/-/g, '/')).getTime() -_now
  //     }
  //   })
  //   if (this.data.page == 1) {
  //     this.setData({
  //       goods: res.data.result
  //     })
  //   } else {
  //     this.setData({
  //       goods: this.data.goods.concat(res.data.result)
  //     })
  //   }
  //   this.processBadge()
  // },

  // 连续滚动模式的商品加载逻辑
  async _getGoodsListContinuous() {
    wx.showLoading({
      title: '',
    })

    // const categories = this.data.categories
    let subCategories = this.data.subCategories
    const level2CategoryIndex = this.data.level2CategoryIndex
    let allGoods = this.data.goods || []
    let goodsByCategory = this.data.goodsByCategory || []

    // 如果是首次加载，重置数据
    if (this.data.page == 1) {
      allGoods = []
      goodsByCategory = []
    }

    // 循环加载所有分类的商品
    for (let i = level2CategoryIndex; i < subCategories.length; i++) {
      console.log("类别",level2CategoryIndex)
      const category = subCategories[i]
      console.log("类别信息",category)
      const res = await WXAPI.goodsv2({
        page: 1, // 每个分类都从第一页开始
        categoryId: category.id,
        pageSize: 10000
      })

      if (res.code == 0 && res.data.result && res.data.result.length > 0) {
        // 处理秒杀商品倒计时
        // res.data.result.forEach(ele => {
        //   if (ele.miaosha) {
        //     const _now = new Date().getTime()
        //     ele.dateStartInt = new Date(ele.dateStart.replace(/-/g, '/')).getTime() - _now
        //     ele.dateEndInt = new Date(ele.dateEnd.replace(/-/g, '/')).getTime() - _now
        //   }
        // })

        // 对结果根据 categoryId 进行排序
        res.data.result.sort((a, b) => a.categoryId - b.categoryId);
        console.log("商品信息",res.data.result)
        // 记录该分类的商品范围
        const startIndex = allGoods.length
        const endIndex = startIndex + res.data.result.length - 1
        goodsByCategory.push({
          categoryId: category.id,
          categoryName: category.name,
          startIndex: startIndex,
          endIndex: endIndex,
          goodsCount: res.data.result.length
        })

        // 添加到总商品列表
        allGoods = allGoods.concat(res.data.result)

        // 如果加载到足够商品，停止加载更多分类
        if (allGoods.length >= 5) { // 限制初始加载数量
          break
        }
      }
    }
    console.log("首次加载商品",goodsByCategory)
    wx.hideLoading()

    this.setData({
      goods: allGoods,
      goodsByCategory: goodsByCategory,
      // level1CategoryIndex: Math.min(level1CategoryIndex + 1, categories.length - 1),
      // level2CategoryIndex: Math.min(level2CategoryIndex + 1, subCategories.length - 1),
      level2CategoryIndex: 0 // 初始化为激活状态
    })

    console.log('商品数据加载完成，分类数据:', goodsByCategory)
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
    console.log("this.data.page",this.data.page)
  },

  // 连续滚动模式下加载更多分类的商品
  async _loadMoreCategories() {
    // const categories = this.data.categories
    const subCategories = this.data.subCategories
    console.log("加载更多分类的商品",subCategories)
    // const level1CategoryIndex = this.data.level1CategoryIndex
    const level2CategoryIndex = this.data.level2CategoryIndex
    let allGoods = this.data.goods || []
    let goodsByCategory = this.data.goodsByCategory || []

    // 如果已经加载完所有分类，不再加载
    // if (level1CategoryIndex >= categories.length) {
    //   return
    // }
    if (level2CategoryIndex >= subCategories.length) {
      return
    }

    wx.showLoading({
      title: '',
    })

    // 从当前分类索引开始继续加载
    for (let i = level2CategoryIndex; i < subCategories.length; i++) {
      const category = subCategories[i]

      // 检查该分类是否已经加载过（防止重复）
      const alreadyLoaded = goodsByCategory.some(item => item.categoryId === category.id)
      if (alreadyLoaded) {
        console.log(`分类 ${category.name} (id: ${category.id}) 已加载，跳过`)
        continue  // 跳过已加载的分类，继续下一个
      }

      console.log("加载分类", category.name, "索引", i)
      const res = await WXAPI.goodsv2({
        page: 1,
        categoryId: category.id,
        pageSize: 10000
      })

      if (res.code == 0 && res.data.result && res.data.result.length > 0) {
        // 处理秒杀商品倒计时
        // res.data.result.forEach(ele => {
        //   if (ele.miaosha) {
        //     const _now = new Date().getTime()
        //     ele.dateStartInt = new Date(ele.dateStart.replace(/-/g, '/')).getTime() - _now
        //     ele.dateEndInt = new Date(ele.dateEnd.replace(/-/g, '/')).getTime() - _now
        //   }
        // })

        // 对结果根据 categoryId 进行排序
        res.data.result.sort((a, b) => a.categoryId - b.categoryId);

        // 记录该分类的商品范围
        const startIndex = allGoods.length
        const endIndex = startIndex + res.data.result.length - 1
        goodsByCategory.push({
          categoryId: category.id,
          categoryName: category.name,
          startIndex: startIndex,
          endIndex: endIndex,
          goodsCount: res.data.result.length
        })

        // 添加到总商品列表
        allGoods = allGoods.concat(res.data.result)

        // 每次只加载一个分类，避免一次性加载太多
        break
      }
    }

    wx.hideLoading()

    this.setData({
      goods: allGoods,
      goodsByCategory: goodsByCategory,
      // level2CategoryIndex: Math.min(level2CategoryIndex + 1, subCategories.length)
      // 注意：不在这里设置currentCategoryIndex，以避免影响滚动时的选中状态
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
    this._calculateCurrentCategory(scrollTop)
  },

  // 计算当前滚动位置对应的分类
  _calculateCurrentCategory(scrollTop) {
    const goodsByCategory = this.data.goodsByCategory
    if (!goodsByCategory || goodsByCategory.length === 0) {
      console.log('goodsByCategory为空，无法计算分类')
      return
    }

    // 更准确的估算值（rpx转px，微信小程序中1rpx = 0.5px在大多数设备上）
    // const itemHeight = 200 // 每个商品卡片约200px高度（包括间距）
    const itemHeight = 100 // 每个商品卡片约200px高度（包括间距）
    // const headerHeight = 200 // banner等头部高度约200px
    const headerHeight = 0 // banner等已注释

    // 计算当前可见区域的商品索引
    const visibleStartIndex = Math.max(0, Math.floor((scrollTop - headerHeight) / itemHeight))

    console.log('计算分类 - 滚动位置:', scrollTop, '可见商品索引:', visibleStartIndex, '分类数据:', goodsByCategory)

    // 找到对应的分类（在 goodsByCategory 中）
    let matchedCategory = null
    for (let i = 0; i < goodsByCategory.length; i++) {
      const category = goodsByCategory[i]
      if (visibleStartIndex >= category.startIndex && visibleStartIndex <= category.endIndex) {
        matchedCategory = category
        console.log("goodsByCategory",goodsByCategory)
        console.log('找到匹配分类:', i, category)
        break
      }
    }

    // 如果滚动到了最后，使用最后一个分类
    if (!matchedCategory && goodsByCategory.length > 0) {
      if (visibleStartIndex >= goodsByCategory[goodsByCategory.length - 1].endIndex) {
        matchedCategory = goodsByCategory[goodsByCategory.length - 1]
        console.log('滚动到最后，使用最后一个分类:', matchedCategory)
      }
    }

    // // 找到对应的分类
    // let level2CategoryIndex = 0
    // for (let i = 0; i < goodsByCategory.length; i++) {
    //   const category = goodsByCategory[i]
    //   if (visibleStartIndex >= category.startIndex && visibleStartIndex <= category.endIndex) {
    //     level2CategoryIndex = i
    //     console.log('找到匹配分类:', i, category)
    //     break
    //   }
    // }

    // ⭐ 关键修复：根据 categoryId 在 subCategories 中找到对应的索引
    const subCategories = this.data.subCategories
    console.log("subCategories",subCategories)
    let level2CategoryIndex = 0
    if (matchedCategory) {
      const foundIndex = subCategories.findIndex(cat => cat.id === matchedCategory.categoryId)
      if (foundIndex >= 0) {
        level2CategoryIndex = foundIndex  // 这是 subCategories 的索引
        console.log('在subCategories中找到分类索引:', level2CategoryIndex, '分类名称:', subCategories[foundIndex].name)
      } else {
        console.log('未在subCategories中找到分类，categoryId:', matchedCategory.categoryId)
        // 如果找不到，保持当前索引，不更新
        return
      }
    }

    // 如果滚动到了最后，设置最后一个分类为激活状态
    // if (visibleStartIndex >= goodsByCategory[goodsByCategory.length - 1].endIndex) {
    //   level2CategoryIndex = goodsByCategory.length - 1
    //   console.log('滚动到最后，设置最后一个分类:', level2CategoryIndex)
    // }

    console.log('最终激活分类:', level2CategoryIndex, '当前值:', this.data.level2CategoryIndex)

    // 更新当前分类索引
    if (level2CategoryIndex !== this.data.level2CategoryIndex) {
      console.log('更新激活分类:', level2CategoryIndex)
      this.setData({
        level2CategoryIndex: level2CategoryIndex
      })
    }
  },

  categoryClick(e) {
    const index = e.currentTarget.dataset.idx
    console.log("点击的类别",index)
    if (!this.data.isContinuousMode) {
      // 原有的单分类模式
      // const categorySelected = this.data.categories[index]
      const categorySelected = this.data.subCategories[index]
      this.setData({
        page: 1,
        categorySelected,
        scrolltop: 0
      })
      this.getGoodsList()
      return
    }

    // 连续滚动模式：滚动到对应分类的第一个商品
    this._scrollToCategory(index)
  },

  // 滚动到指定分类的第一个商品
  _scrollToCategory(level2CategoryIndex) {
    const goodsByCategory = this.data.goodsByCategory
    console.log("此时的goodsByCategory拥有的数据",goodsByCategory)
    if (!goodsByCategory || goodsByCategory.length <= level2CategoryIndex) {
      return
    }

    const category = goodsByCategory[level2CategoryIndex]
    console.log("点击的类别在goodsByCategory的信息",category)
    if (!category) {
      return
    }

    // 估算滚动位置：商品索引 * 商品高度 + 头部高度
    const itemHeight = 200 // 与_calculateCurrentCategory中的估算值保持一致
    const headerHeight = 200 // banner等头部高度
    const scrollTop = category.startIndex * itemHeight + headerHeight

    this.setData({
      scrollTop: scrollTop,
      // currentCategoryIndex: categoryIndex
      level2CategoryIndex:level2CategoryIndex
    })

    // 使用scroll-view的滚动方法
    // 注意：需要在wxml中为scroll-view添加scroll-top属性绑定
  },

  async shippingCarInfo() {
    console.log("进入了shippingCarInfo")
    console.log("currentLevel1Category",this.data.currentLevel1Category)
    let res = null
    if(this.data.currentLevel1Category.id == 559239){
      res = await WXAPI.shippingCarInfo(wx.getStorageSync('token'),"delivery")
    }
    else {
      res = await WXAPI.shippingCarInfo(wx.getStorageSync('token'),"self-pickup")
    }
    // const res = await WXAPI.shippingCarInfo(wx.getStorageSync('token'))
    console.log("获取购物车结果",res)
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
        url: '/pages/cart/index',
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
    const token = wx.getStorageSync('token')
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
    console.log("addCart1的currentLevel1Category",this.data.currentLevel1Category.id)
    let res = null
    if(this.data.currentLevel1Category.id == 559239){
      res = await WXAPI.shippingCarInfoAddItem(token, item.id, number, [], [], "delivery")
    }
    else {
      res = await WXAPI.shippingCarInfoAddItem(token, item.id, number, [], [], "self-pickup")
    }
    // const res = await WXAPI.shippingCarInfoAddItem(token, item.id, number, [], [])
    console.log("添加购物车结果",res)
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
    const token = wx.getStorageSync('token')
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
    if(this.data.currentLevel1Category.id == 559239){
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

    // const d = {
    //   token,
    //   goodsId: curGoodsMap.basicInfo.id,
    //   number: curGoodsMap.number,
    //   sku: sku && sku.length > 0 ? JSON.stringify(sku) : '',
    //   addition: goodsAddition && goodsAddition.length > 0 ? JSON.stringify(goodsAddition) : '',
    // }
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
    console.log("addCart2的currentLevel1Category",this.data.currentLevel1Category.id)
    
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
    const token = wx.getStorageSync('token')
    console.log("进入了移除商品")
    const index = e.currentTarget.dataset.idx
    const item = this.data.shippingCarInfo.items[index]
    const currentLevel1Category = this.data.currentLevel1Category
    console.log("currentLevel1Category",currentLevel1Category)
    if (e.detail < 1) {
      // 删除商品
      wx.showLoading({
        title: '',
      })
      let res = null
      if(currentLevel1Category.id == 559239){
        res = await WXAPI.shippingCarInfoRemoveItem(token, item.key, "delivery")
      }
      else {
        res = await WXAPI.shippingCarInfoRemoveItem(token, item.key, "self-pickup")
      }
      // const res = await WXAPI.shippingCarInfoRemoveItem(token, item.key)
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
      if(currentLevel1Category.id == 559239){
        res = await WXAPI.shippingCarInfoModifyNumber(token, item.key, e.detail, "delivery")
      }
      else {
        res = await WXAPI.shippingCarInfoModifyNumber(token, item.key, e.detail, "self-pickup")
      }
      // const res = await WXAPI.shippingCarInfoModifyNumber(token, item.key, e.detail)
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
    // const res = await WXAPI.shippingCarInfoRemoveAll(wx.getStorageSync('token'))
    console.log("清空购物车")
    console.log("currentLevel1Category",this.data.currentLevel1Category)
    let res = null
    if(this.data.currentLevel1Category.id == 559239){
      res = await WXAPI.shippingCarInfoRemoveAll(wx.getStorageSync('token'),"delivery")
    }
    else {
      res = await WXAPI.shippingCarInfoRemoveAll(wx.getStorageSync('token'),"self-pickup")
    }
    wx.hideLoading()
    if (res.code != 0) {
      wx.showToast({
        title: res.msg,
        icon: 'none'
      })
      return
    }
    // wx.hideLoading()
    // if (res.code != 0) {
    //   wx.showToast({
    //     title: res.msg,
    //     icon: 'none'
    //   })
    //   return
    // }
    
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
    const token = wx.getStorageSync('token')
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
    const _data = {
      curGoodsMap: res.data,
      pingtuan_open_id: null,
      lijipingtuanbuy: false
    }
    if (res.data.basicInfo.pingtuan) {
      _data.showPingtuanPop = true
      _data.showGoodsDetailPOP = false
      // 获取拼团设置
      const resPintuanSet = await WXAPI.pingtuanSet(goodsId)
      if (resPintuanSet.code != 0) {
        _data.showPingtuanPop = false
        _data.showGoodsDetailPOP = true
        wx.showToast({
          title: this.data.$t.index.pingtuanNoOpen,
          icon: 'none'
        })
        return
      } else {
        _data.pintuanSet = resPintuanSet.data
        // 是否是别人分享的团进来的
        if (this.data.share_goods_id && this.data.share_goods_id == goodsId && this.data.share_pingtuan_open_id) {
          // 分享进来的
          _data.pingtuan_open_id = this.data.share_pingtuan_open_id
        } else {
          // 不是通过分享进来的
          const resPintuanOpen = await WXAPI.pingtuanOpen(token, goodsId)
          if (resPintuanOpen.code == 2000) {
            AUTH.login(this)
            return
          }
          if (resPintuanOpen.code != 0) {
            wx.showToast({
              title: resPintuanOpen.msg,
              icon: 'none'
            })
            return
          }
          _data.pingtuan_open_id = resPintuanOpen.data.id
        }
        // 读取拼团记录
        const helpUsers = []
        for (let i = 0; i < _data.pintuanSet.numberOrder; i++) {
          helpUsers[i] = '/images/who.png'
        }
        _data.helpNumers = 0
        const resPingtuanJoinUsers = await WXAPI.pingtuanJoinUsers(_data.pingtuan_open_id)
        if (resPingtuanJoinUsers.code == 700 && this.data.share_pingtuan_open_id) {
          this.data.share_pingtuan_open_id = null
          this._showGoodsDetailPOP(goodsId)
          return
        }
        if (resPingtuanJoinUsers.code == 0) {
          _data.helpNumers = resPingtuanJoinUsers.data.length
          resPingtuanJoinUsers.data.forEach((ele, index) => {
            if (_data.pintuanSet.numberOrder > index) {
              helpUsers.splice(index, 1, ele.apiExtUserHelp.avatarUrl)
            }
          })
        }
        _data.helpUsers = helpUsers
      }
    } else {
      _data.showPingtuanPop = false
      _data.showGoodsDetailPOP = true
    }
    this.setData(_data)
  },
  hideGoodsDetailPOP() {
    this.setData({
      showGoodsDetailPOP: false,
      showPingtuanPop: false
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
    if (this.data.currentLevel1Category) {
      wx.setStorageSync('currentLevel1Category', this.data.currentLevel1Category)
    }
    if (this.data.scanDining) {
      // 扫码点餐，前往购物车
      wx.navigateTo({
        url: '/pages/cart/index',
      })
    } else {
      wx.navigateTo({
        url: '/pages/pay/index',
      })
    }
  },
  onShareAppMessage: function() {
    let uid = wx.getStorageSync('uid')
    if (!uid) {
      uid = ''
    }
    let path = '/pages/index/index?inviter_id=' + uid
    if (this.data.pingtuan_open_id) {
      path = path + '&share_goods_id=' +  this.data.curGoodsMap.basicInfo.id + '&share_pingtuan_open_id=' +  this.data.pingtuan_open_id
    }
    return {
      title: '"' + wx.getStorageSync('mallName') + '" ' + wx.getStorageSync('share_profile'),
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
      url: '/pages/coupons/index',
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
      url: '/pages/notice/detail?id=' + id,
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
  yuanjiagoumai() {
    this.setData({
      showPingtuanPop: false,
      showGoodsDetailPOP: true
    })
  },
  _lijipingtuanbuy() {
    const curGoodsMap = this.data.curGoodsMap
    curGoodsMap.price = curGoodsMap.basicInfo.pingtuanPrice
    this.setData({
      curGoodsMap,
      showPingtuanPop: false,
      showGoodsDetailPOP: true,
      lijipingtuanbuy: true
    })
  },
  pingtuanbuy() {
    // 加入 storage 里
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
          optionValueId: small.id,
          optionName: big.name,
          optionValueName: small.name
        })
      })
    }
    const additions = []
    if (curGoodsMap.basicInfo.hasAddition) {
      this.data.goodsAddition.forEach(ele => {
        ele.items.forEach(item => {
          if (item.active) {
            additions.push({
              id: item.id,
              pid: item.pid,
              pname: ele.name,
              name: item.name
            })
          }
        })
      })
    }
    const pingtuanGoodsList = []
    pingtuanGoodsList.push({
      goodsId: curGoodsMap.basicInfo.id,
      number: curGoodsMap.number,
      categoryId: curGoodsMap.basicInfo.categoryId,
      shopId: curGoodsMap.basicInfo.shopId,
      price: curGoodsMap.price,
      score: curGoodsMap.basicInfo.score,
      pic: curGoodsMap.basicInfo.pic,
      name: curGoodsMap.basicInfo.name,
      minBuyNumber: curGoodsMap.basicInfo.minBuyNumber,
      logisticsId: curGoodsMap.basicInfo.logisticsId,
      sku,
      additions
    })
    wx.setStorageSync('pingtuanGoodsList', pingtuanGoodsList)
    // 跳转
    wx.navigateTo({
      url: '/pages/pay/index?orderType=buyNow&pingtuanOpenId=' + this.data.pingtuan_open_id,
    })
  },
  _lijipingtuanbuy2() {
    this.data.share_pingtuan_open_id = null
    this._showGoodsDetailPOP(this.data.curGoodsMap.basicInfo.id)
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
        url: '/pages/cart/index',
      })
    }
    if (e.detail == 2) {
      wx.navigateTo({
        url: '/pages/cart/order',
      })
    }
  },
  // 显示分类和商品数量徽章
  processBadge() {
    // const categories = this.data.categories
    const subCategories = this.data.subCategories
    const goods = this.data.goods
    const shippingCarInfo = this.data.shippingCarInfo
    if (!subCategories) {
      return
    }
    if (!goods) {
      return
    }
    subCategories.forEach(ele => {
      ele.badge = 0
    })
    goods.forEach(ele => {
      ele.badge = 0
    })
    if (shippingCarInfo) {
      shippingCarInfo.items.forEach(ele => {
        if (ele.categoryId) {
          const category = subCategories.find(a => {
            return a.id == ele.categoryId
          })
          if (category) {
            category.badge += ele.number
          }
        }
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
      subCategories,
      goods
    })
  },
  selectshop() {
    wx.navigateTo({
      url: '/pages/shop/select?type=index',
    })
  },
  goGoodsDetail(e) {
    const index = e.currentTarget.dataset.idx
    const goodsId = this.data.goods[index].id
    wx.navigateTo({
      url: '/pages/goods-details/index?id=' + goodsId,
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
  changeLang() {
    getApp().changeLang(this)
  },
  waimai() {
    wx.clearStorageSync()
    wx.showTabBar()
    wx.reLaunch({
      url: '/pages/index/index',
    })
  },
  onHorizontalCategoryClick(e) {
    const index = e.currentTarget.dataset.idx;
    console.log("一级分类序号",index)
    const currentLevel1Category = this.data.level1Categories[index];
    const subCategories = this.data.level2Categories.filter(cat => cat.key === String(currentLevel1Category.id));
    this.setData({
      subCategories: subCategories,
      level1CategoryIndex:index,
      currentLevel1Category:currentLevel1Category,
      level2CategoryIndex:0, // 重置当前索引为第一个
      page: 1 // 重置页码
    });
    // 保存到本地存储，供其他页面使用
    if (currentLevel1Category) {
      wx.setStorageSync('currentLevel1Category', currentLevel1Category)
    }
    // 调用初始化商品列表的函数
    this._getGoodsListContinuous();
    this.shippingCarInfo();
   }
})
