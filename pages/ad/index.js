const WXAPI = require('apifm-wxapi')
const AUTH = require('../../utils/auth')
const APP = getApp()
APP.configLoadOK = () => {
  
}

Page({
  data: {
    addressList: [],
    addressEdit: false,
    cancelBtn: false,
    pickerRegionRange: [],
    pickerSelect:[0, 0, 0],
    addressData: {},
    // 固定省市：广东省 / 汕头市
    fixedProvinceName: '广东省',
    fixedCityName: '汕头市',
  },
  // 添加地址
  addAddress: function() {
    this.setData({
      addressEdit: true,
      cancelBtn: true,
      id: null,
      addressData: {}
    })
  },
  // 取消编辑
  editCancel: function(){
    this.setData({
      addressEdit: false,         
    })
  },
  // 编辑地址
  async editAddress(e) {
    // wx.navigateTo({
    //   url: "/pages/address-add/index?id=" + e.currentTarget.dataset.id
    // })
    var id = e.currentTarget.dataset.id    
    this.setData({ 
      addressEdit: true,
      cancelBtn: false,
      id:id,
    })
    if (id) { // 修改初始化数据库数据
      const res = await WXAPI.addressDetail(wx.getStorageSync('token'), id)
      if (res.code == 0) {
        var addressData = res.data.info
        console.log(addressData)
        var address = addressData.address        
        var pname = addressData.provinceStr
        var cname = addressData.cityStr
        var dname = addressData.areaStr
        // 
        var provinceId = addressData.provinceId
        var cityId = addressData.cityId
        var districtId = addressData.districtId

        this.setData({
          id: id,
          addressData: res.data.info,  
          address: res.data.info.address,        
          pname: pname,
          cname: cname,
          dname: dname,
          provinceId: provinceId,
          cityId: cityId,
          districtId: districtId,
        })
        // console.log(addressData)        
        this.initRegionDB(pname,cname,dname)
        this.provinces(provinceId,cityId,districtId) 
               
      } else {
        wx.showModal({
          confirmText: this.data.$t.common.confirm,
          cancelText: this.data.$t.common.cancel,
          content: this.data.$t.ad_index.apiError,
          showCancel: false
        })
      }
    } else {
      this.initRegionPicker()
    }  
    
  }, 
  // 选中地址
  selectTap: function(e) {
    var id = e.currentTarget.dataset.id;
    WXAPI.updateAddress({
      token: wx.getStorageSync('token'),
      id: id,
      isDefault: 'true'
    }).then(function(res) {
      wx.navigateBack({})
    })
  },
  // 删除地址按钮
  deleteAddress: function (e) {
    const _this = this
    const id = e.currentTarget.dataset.id;
    console.log(id)
    wx.showModal({
      confirmText: this.data.$t.common.confirm,
      cancelText: this.data.$t.common.cancel,
      content: this.data.$t.ad_index.deleteProfile,
      success: function (res) {
        if (res.confirm) {
          WXAPI.deleteAddress(wx.getStorageSync('token'), id).then(function () {
            _this.setData({
              addressEdit: false,
              cancelBtn: false,
            })
            _this.initShippingAddress()
          })
        }
      }
    })
  },
  // 微信读取
  readFromWx : function () {
    const _this = this
    wx.chooseAddress({
      success: function (res) {
        console.log(res)
        _this.initRegionDB(res.provinceName, res.cityName, res.countyName)
        _this.setData({
          wxaddress: res
        });
      }
    })
  },  
  // 获取地址列表
  async initShippingAddress() {
    wx.showLoading({
      title: '',
    })
    const res = await WXAPI.queryAddress(wx.getStorageSync('token'))
    wx.hideLoading({
      success: (res) => {},
    })
    if (res.code == 0) {
      this.setData({
        addressList: res.data
      });
    } else {
      this.setData({
        addressList: null
      });
    }
  },   
  // 省市选择器 三栏
  async initRegionPicker () {
    // 固定为：广东省 / 汕头市，仅允许选择区县
    const res = await WXAPI.provinceV2()
    if (res.code !== 0) {
      return
    }
    const provinces = res.data || []
    const pObject = provinces.find(p => p.name === this.data.fixedProvinceName)
    if (!pObject) {
      return
    }
    const resCity = await WXAPI.nextRegionV2(pObject.id)
    if (resCity.code !== 0) {
      return
    }
    const cities = resCity.data || []
    const cObject = cities.find(c => c.name === this.data.fixedCityName)
    if (!cObject) {
      return
    }
    const resArea = await WXAPI.nextRegionV2(cObject.id)
    if (resArea.code !== 0) {
      return
    }
    const areas = resArea.data || []
    const dObject = areas.length > 0 ? areas[0] : undefined

    this.data.pickerRegionRange = [
      [pObject], // 省固定
      [cObject], // 市固定
      areas       // 区可选
    ]
    this.data.pickerSelect = [0, 0, 0]
    this.setData({
      pickerRegionRange: this.data.pickerRegionRange,
      pickerSelect: this.data.pickerSelect,
      pObject,
      cObject,
      dObject,
      showRegionStr: pObject.name + cObject.name + (dObject ? dObject.name : '')
    })
  },
  async initRegionDB (pname, cname, dname) {
    // 忽略传入的省市，强制固定为：广东省 / 汕头市
    // dname（区县）如果存在，则定位到对应区县
    await this.initRegionPicker()
    const pObject = this.data.pickerRegionRange?.[0]?.[0]
    const cObject = this.data.pickerRegionRange?.[1]?.[0]
    let dObject = this.data.pickerRegionRange?.[2]?.[0]
    let dIndex = 0
    if (dname && this.data.pickerRegionRange?.[2]?.length) {
      const idx = this.data.pickerRegionRange[2].findIndex(ele => ele.name === dname)
      if (idx >= 0) {
        dIndex = idx
        dObject = this.data.pickerRegionRange[2][idx]
      }
    }
    this.data.pickerSelect = [0, 0, dIndex]
    this.setData({
      pickerSelect: this.data.pickerSelect,
      showRegionStr: (pObject?.name || '') + (cObject?.name || '') + (dObject?.name || ''),
      pObject,
      cObject,
      dObject
    })
    
  },  
  bindchange: function(e) {    
    // 省市固定，区县可选
    const pObject = this.data.pickerRegionRange[0][0]
    const cObject = this.data.pickerRegionRange[1][0]
    const dObject = this.data.pickerRegionRange[2][e.detail.value[2]]
    const showRegionStr = pObject.name + cObject.name + dObject.name
    this.setData({
      pObject: pObject,
      cObject: cObject,
      dObject: dObject,
      showRegionStr: showRegionStr,
      pickerSelect: [0, 0, e.detail.value[2]]
    })
  },
  bindcolumnchange: function(e) {
    const column = e.detail.column
    // 省市固定，禁止切换（直接忽略）
    if (column === 0 || column === 1) {
      this.setData({
        pickerSelect: this.data.pickerSelect
      })
      return
    }
    const index = e.detail.value
    const regionObject = this.data.pickerRegionRange[column][index]
    if (column === 2) {
      this.setData({
        pickerRegionRange: this.data.pickerRegionRange
      })
      return
    }
    if (column === 1) {
      this.data.pickerRegionRange[2] = [{ name: this.data.$t.common.select }]
    }
    if (column === 0) {
      this.data.pickerRegionRange[1] = [{ name: this.data.$t.common.select }]
      this.data.pickerRegionRange[2] = [{ name: this.data.$t.common.select }]
    }
    // // 后面的数组全部清空
    // this.data.pickerRegionRange.splice(column+1)
    // 追加后面的一级数组
    // https://www.yuque.com/apifm/nu0f75/kfukig
    WXAPI.nextRegionV2(regionObject.id).then(res => {
      if (res.code === 0) {
        this.data.pickerRegionRange[column + 1] = res.data     
      }
      this.bindcolumnchange({ detail: { column: column + 1, value: 0 } })
    })
  },  
  // 
  async provinces(provinceId, cityId, districtId) {
    // 编辑地址时，也强制固定为：广东省 / 汕头市，只回显区县
    await this.initRegionPicker()
    const areas = this.data.pickerRegionRange?.[2] || []
    let aIndex = 0
    if (districtId && areas.length) {
      const idx = areas.findIndex(ele => String(ele.id) === String(districtId))
      if (idx >= 0) {
        aIndex = idx
      }
    }
    const dObject = areas[aIndex]
    this.data.pickerSelect = [0, 0, aIndex]
    this.setData({
      pickerSelect: this.data.pickerSelect,
      dObject,
      showRegionStr: (this.data.pickerRegionRange?.[0]?.[0]?.name || '') + (this.data.pickerRegionRange?.[1]?.[0]?.name || '') + (dObject?.name || '')
    })
    
  },
  linkManChange(e) {
    const addressData = this.data.addressData
    addressData.linkMan = e.detail
    this.setData({
      addressData
    })
  },
  mobileChange(e) {
    const addressData = this.data.addressData
    addressData.mobile = e.detail
    this.setData({
      addressData
    })
  },
  addressChange(e) {
    const addressData = this.data.addressData
    addressData.address = e.detail
    this.setData({
      addressData
    })
  },
  // 保存按钮
  async bindSave() {    
    const pObject = this.data.pObject
    const cObject = this.data.cObject
    const dObject = this.data.dObject
    const linkMan = this.data.addressData.linkMan
    const address = this.data.addressData.address
    const mobile = this.data.addressData.mobile
    const latitude = this.data.addressData.latitude
    const longitude = this.data.addressData.longitude

    if (!linkMan){
      wx.showToast({
        title: this.data.$t.ad_index.linkManPlaceholder,
        icon: 'none',        
      })
      return
    }
    if (!mobile){
      wx.showToast({
        title: this.data.$t.ad_index.mobilePlaceholder,
        icon: 'none',        
      })
      return
    }
    if (!this.data.pObject || !this.data.cObject || !this.data.dObject){
      wx.showToast({
        title: this.data.$t.ad_index.region,
        icon: 'none',        
      })
      return
    }
    if (!latitude){
      wx.showToast({
        title: this.data.$t.ad_index.location,
        icon: 'none',       
      })
      return
    }
    if (!address){
      wx.showToast({
        title: this.data.$t.ad_index.address,
        icon: 'none',       
      })
      return
    }
    
    const postData = {
      token: wx.getStorageSync('token'),
      linkMan: linkMan,
      address: address,
      mobile: mobile,
      isDefault: 'true',
      latitude,
      longitude
    }     

    // console.log(this.data.pIndex)
    // console.log(this.data.cIndex)
    // console.log(this.data.aIndex)

    postData.provinceId = pObject.id
    postData.cityId = cObject.id  
    postData.districtId = dObject.id

    // if (this.data.pIndex >= 0) {
    //   postData.provinceId = pObject.id    
    // }
    // if (this.data.cIndex >= 0) {
    //   postData.cityId = cObject.id  
    // }
    // if (this.data.aIndex >= 0) {
    //   postData.districtId = dObject.id  
    // }    
    let apiResult
    console.log(this.data.id)
    if (this.data.id) {
      postData.id = this.data.id
      apiResult = await WXAPI.updateAddress(postData)
    } else {
      apiResult = await WXAPI.addAddress(postData)
    }
    if (apiResult.code != 0) {
      // 登录错误 
      wx.hideLoading();
      wx.showToast({
        title: apiResult.msg,
        icon: 'none'
      })
      return;
    } else {
      this.setData({
        addressEdit: false,
        cancelBtn: false,
      })
      this.initShippingAddress()
    }    
    
  },
  onLoad(e) {
    getApp().initLanguage(this)
    wx.setNavigationBarTitle({
      title: this.data.$t.ad_index.title,
    })
    this.setData({
      showRegionStr: this.data.$t.ad_index.regionPlaceholder
    })
    const _this = this
    this.initRegionPicker() // 初始化省市区选择器
    if (e.id) { // 修改初始化数据库数据
      WXAPI.addressDetail(e.id, wx.getStorageSync('token')).then(function (res) {
        if (res.code === 0) {
          _this.setData({
            id: e.id,
            addressData: res.data,
            showRegionStr: res.data.provinceStr + res.data.cityStr + res.data.areaStr
          });
          _this.initRegionDB(res.data.provinceStr, res.data.cityStr, res.data.areaStr)
          return;
        } else {
          wx.showModal({
            confirmText: this.data.$t.common.confirm,
            cancelText: this.data.$t.common.cancel,
            content: this.data.$t.ad_index.apiError,
            showCancel: false
          })
        }
      })
    }
  },
  onShow: function() {
    AUTH.checkHasLogined().then(isLogined => {
      if (isLogined) {
        this.initShippingAddress();
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
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        const addressData = this.data.addressData
        addressData.address = res.address + res.name
        addressData.latitude = res.latitude
        addressData.longitude = res.longitude
        this.setData({
          addressData
        })
      },
      fail: (e) => {
        console.error(e)
      },
    })
  },
})

