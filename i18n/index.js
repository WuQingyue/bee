function $t(){
  // return require(getLanguage() + '.js');
  return require('zh_CN.js')
}
module.exports = {
  $t: $t,
  langs: [
    {
      name: '简体中文',
      code: 'zh_CN'
    },
    {
      name: 'English',
      code: 'en'
    }
  ]
}