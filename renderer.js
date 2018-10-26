// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const {ipcRenderer} = require('electron')
// const path = require('path')
const Redis = require('ioredis');

let modal = document.getElementById('modal-add-redis')
let redisConfigJsonInput = document.getElementById('redis-config-json')
let redisConfigNameInput = document.getElementById('redis-config-name')
/** */
let cluster = null
let currentKey = ''
let resultEle = document.querySelector('#redisResult')
let dataTypeEle = document.querySelector('#dataType')
let dataSizeEle = document.querySelector('#dataSize')
let dataTtlEle = document.querySelector('#dataTtl')
let delEle = document.querySelector('#delData')
let errorInfoEle = document.querySelector('#errorInfo')
let getDataEle = document.getElementById('getDataBtn')
// let gobackEle = document.getElementById('gobackBtn')
let redisParamEle = document.getElementById('redisParam')
// let lastPara = ''
// let lastDataInfo = ''
let doGetDataAction = ()=>{
  let param = redisParamEle.value
  if(param){
    clearDataInfo()
    getData(param)
    // lastPara =redisParamEle.value
  }
}
getDataEle.addEventListener('click', doGetDataAction)
redisParamEle.onkeydown = (event)=>{
  if (event.keyCode == "13") {            
      event.preventDefault(); 
      //回车执行查询
      doGetDataAction()
  }
}

// gobackEle.addEventListener('click', function (event) {
//   redisParamEle.value = lastPara
//   resultEle.innerHTML = lastDataInfo
// })

resultEle.addEventListener('click', function (event) {
  let target = event.target
  // console.log(target.tagName, target.innerText)
  if(target.tagName === 'LI' && target.innerText){
    queryKey(target.innerText)
    redisParamEle.value = target.innerText
  }
})
delEle.addEventListener('click', function (event) {
  delData(currentKey)
  currentKey = ''
})

let clearDataInfo = ()=>{
  resultEle.innerText = ''
  dataTypeEle.innerText = ''
  dataSizeEle.innerText = ''
  dataTtlEle.innerText = ''
  errorInfoEle.innerText = ''
}
let clearParam = ()=>{
  redisParamEle.innerText = ''
}


document.getElementById('add').addEventListener('click', function (event) {
  redisConfigNameInput.value = ''
  redisConfigJsonInput.value = `[{
    "port": 6379,
    "password": "6666",
    "host": "127.0.0.1"
  }]`
  modal.style.display = 'block'
})
let claseModal = ()=>{
  modal && (modal.style.display = 'none')
}
document.getElementById('modal-add-confirm').addEventListener('click', function (event) {
  
  let name = redisConfigNameInput.value
  if(!name) {
    alert('名称不能为空！')
    return
  }
  let config = redisConfigJsonInput.value
  let configJson = null
  try {
    // console.log(config)
    configJson = JSON.parse(config)
    // console.log(configJson)
  } catch (e) {
    alert('redis配置参数异常：'+e)
    return
  }
  if(!configJson) {
    alert('redis配置参数不能为空！')
    return
  }
  saveConfig(name,configJson)
  claseModal()
})

document.getElementById('modal-add-cancle').addEventListener('click', function (event) {
  claseModal()
})

/* */

let configList = []

let saveConfig = (name, config)=>{
  !configList && (configList=[])
  for (let i=0,config; config=configList[i]; i++) {
    if(config.name && name === config.name){
      alert('名称不能重复')
      return
    }
  }
  configList.push({
    name:name,
    config:config
  })
  window.localStorage.setItem('redisConfigList',JSON.stringify(configList))
  redistListEle.innerHTML = ''
  freshRedisList()
}

let getRedisConfig = (name)=>{
  for (let i=0,config; config=configList[i]; i++) {
    if(config.name && name === config.name){
      return config.config
    }
  }
}
let delConfig = (name)=>{
  for (let i=0,config; config=configList[i]; i++) {
    if(config.name && name === config.name){
      configList.splice(i,1)
      break;
    }
  }
  window.localStorage.setItem('redisConfigList',JSON.stringify(configList))
  redistListEle.innerHTML = ''
  freshRedisList()
}

let editConfig = (id)=>{
  let config = getRedisConfig(id)
  redisConfigNameInput.value = id
  redisConfigJsonInput.value = JSON.stringify(config)
  modal.style.display = 'block'
}

/*已配置的redis列表*/
let redistListEle = document.getElementById('redisList')
let freshRedisList = ()=>{
  for (let key in configList) {
    redistListEle.appendChild(genRedisConfigEle(configList[key].name))
  }
}
let initRedisList = ()=>{
  let configStr = window.localStorage.getItem('redisConfigList')
  if(configStr === undefined){
    return
  }
  configList = JSON.parse(configStr)
  freshRedisList()
}
let genRedisConfigEle = (name)=>{
  let newLi = document.createElement("li");
  newLi.innerHTML = `<span>${name}</span><span class="btn btn-normal" id="connectEdit">编辑</span><span class="btn btn-error" id="connectDel">删除</span>`
  newLi.className = 'redis-config-box'
  newLi.id = name
  return newLi
}

let currentRedisId = ''
let currentRedisEle = null
redistListEle.addEventListener('click', function (event) {
  let target = event.target
  let parent = target.tagName === 'SPAN'? target.parentNode : target
  if(parent.tagName === 'LI' && parent.id){
    let btnId = target.id
    if(btnId === 'connectEdit'){
      editConfig(parent.id)
      return
    } else if(btnId === 'connectDel'){
      let r = confirm("确定要删除此连接!");
      if (r == true) {
        delConfig(parent.id)
      }
      return
    }
    if(currentRedisId === parent.id){
      console.log('不能重复连接')
    } else {
      if(currentRedisId){
        currentRedisEle.className = 'redis-config-box'
        closeRedis()
      }
      currentRedisEle = parent
      let config = getRedisConfig(parent.id)
      clearConncetInfo()
      clearParam()
      clearDataInfo()
      if(config && config.length > 0){
        if(initCluster(config) ) {
          currentRedisId = parent.id
          currentRedisEle.className = 'redis-config-box redisConnected'
        }
      }
    }
  }
})

window.onload = function(){
  initRedisList()
}

/*实际连接上的redis信息 */
let redisConnectListEle = document.getElementById('redisConnectList')
let redisConnectStateEle = document.getElementById('redisConnectState')
let genRedisConnectEle = (master, slaves)=>{
  let newLi = document.createElement("li");
  let html = `<div><span>Master:${master}</span></div><ol>`
  for(let i=0, s; s=slaves[i]; i++){
    html += '<li>'+s+'</li>'
  }
  html += '</ol>'
  newLi.innerHTML = html
  newLi.className = 'redis-connect-box'
  newLi.id = name
  return newLi
}

let handleOneConnect = (node)=>{
  let master = node.options.host
    let slaves = null
    node.info().then((d)=>{
      // console.log('info',d)
      slaves = d.match(/slave[\d]{1}:ip=[\d\.]{7,}/ig)
      if(slaves){
        for(let i=0,len=slaves.length;  i<len; i++){
          slaves[i] = slaves[i].replace('ip=','')
        }
      } else {
        slaves = []
      }
      redisConnectListEle.appendChild(genRedisConnectEle(master, slaves))
    })
}
let currentDBNumber = 0
let handleSingleConnect = (node)=>{
  let master = node.options.host
  currentDBNumber = node.options.db
    let dbs = null
    node.info().then((d)=>{
      // console.log('info',d)
      dbs = d.match(/db[\d]{1,2}:.+/ig)
      if(dbs){
        for(let i=0,len=dbs.length;  i<len; i++){
          let label = dbs[i].substring(0, dbs[i].indexOf(','))
          let number = dbs[i].substring(2,dbs[i].indexOf(':'))
          let checked = ''
          if(number === ''+currentDBNumber){
            checked = 'checked'
          }
          dbs[i] = '<input '+checked+' type="radio" id="dbNumber'+number+'" name="dbNumber" value="'+number+'"><label for="dbNumber'+number+'">'+label+'</label>'
        }
      } else {
        dbs = []
      }
      redisConnectListEle.appendChild(genRedisConnectEle(master, dbs))
    })
}

redisConnectListEle.addEventListener('click', function (event) {
  let target = event.target
  // console.log(target.tagName, target.value)
  if(target.tagName === 'INPUT'){
    closeRedis()
    currentRedisConfig[0].db=target.value
    initCluster(currentRedisConfig)
  }
})

let parseConnectInfo = (datas)=>{
  // console.log(datas)
  if(datas && datas.length > 0){
    redisConnectStateEle.innerHTML='已连接'
  }
  for(let i=0, d; d=datas[i]; i++){
    d && handleOneConnect(d)
  }
}
let parseSingleConnectInfo = (node)=>{
  if(node){
    // console.log(node)
    redisConnectStateEle.innerHTML='已连接'
    handleSingleConnect(node)
  }
}
let clearConncetInfo = ()=>{
  redisConnectStateEle.innerHTML='未连接'
  redisConnectListEle.innerHTML=''
}


/*  */
let currentRedisConfig = null
let connectCounter = 0
let initCluster = (config)=>{
  for(let i=0, c; c = config[i]; i++){
    c.connectTimeout = 0
  }
  // console.log(config) 
  if(config.length === 1){
    cluster = new Redis(config[0]);
  } else {
    cluster = new Redis.Cluster(config);
  }
  connectCounter = 0
  console.log('***  initCluster  ***')
  cluster.on('connect',function(){
    if(config.length === 1){
      parseSingleConnectInfo(cluster);
    } else {
      let nodes = cluster.nodes('master')
      parseConnectInfo(nodes);
    }
  });
  cluster.on('error',function(err){
    connectCounter++
    console.error("REDIS CONNECT error "+ err);
    console.error('node error', err.lastNodeError);
    if(connectCounter > 5){
      cluster.disconnect()
      redisConnectStateEle.innerHTML='('+currentRedisId+')连接失败'
    }
  });
  currentRedisConfig = config
  return true
}
// let iconv = require('iconv-lite'); 

// console.log('iconv',iconv.decode(Buffer.from('\x80\xAC\xED\x00\x05'),'utf8'))
// const StringDecoder = require('string_decoder').StringDecoder;
let loadData = (err, res)=>{
  let isJson = res instanceof Object || res instanceof Array
  dataSizeEle.innerText = res instanceof Array? res.length : 1
  let data = isJson? JSON.stringify(res) : res
  resultEle.innerText = data
  // lastDataInfo = resultEle.innerHTML
  // console.log('result',err, res)
  errorInfoEle.innerText = '执行成功'
}

let showKeys = (keys)=>{
  let html = '<ol>'
  for(let i=0, k; k = keys[i]; i++){
    html += '<li>'+k+'</li>'
  }
  html += '</ol>'
  resultEle.innerHTML = html
  // lastDataInfo = html
}

let dataType = ''
let getData = (key)=>{
  var masters = cluster.nodes('master');
  let keys = []
  Promise.all(masters.map(function (node) {
    return new Promise(function  (resolve,reject) {
      node.keys(key, function (err, res) {
        // console.log('keys',err, res)
        keys = keys.concat(res)
        resolve();
      })
    })
  })).then(()=>{
    // console.log('keys end')
    if(keys.length === 0){
      errorInfoEle.innerText = '无匹配的关键字'
    } else if(keys.length === 1){
      queryKey(keys)
    } else {
      showKeys(keys)
    }
  })
  
}
let queryKey = (key)=>{
  cluster.ttl(key, function (err, res) {
    // console.log('ttl',err, res)
    dataTtlEle.innerText = res
  })

  cluster.type(key, function (err, res) {
    // console.log('type',err, res)
    dataType = res
    currentKey = key
    dataTypeEle.innerText = dataType
    switch(dataType){
      case 'string':
        cluster.get(key, loadData)
        break;
      case 'hash':
        cluster.hgetall(key, loadData)
        break;
      case 'list':
        cluster.lrange(key, 0, 99999, loadData)
        break;
      case 'set':
        cluster.smembers(key, loadData)
        break;
      case 'zset':
        cluster.zrange(key, 0, 99999,  loadData)
        break;
      default:
        console.log('未知类型=',dataType)
    }
  });
}
let closeRedis = ()=>{
  if(cluster){
    cluster.disconnect()
    cluster = null
  }
  clearConncetInfo()
}

let delData = (key)=>{
  cluster.del(key,function (err, res) {
    console.log('del',err, res)
    if(err){
      errorInfoEle.innerText = '删除失败='+err
      return
    }
    clearDataInfo()
    clearParam()
    errorInfoEle.innerText = '删除成功'
  })
}
ipcRenderer.send('register', 'ping')
ipcRenderer.on('app-close', (event, arg) => {
  console.log('app-close')
  closeRedis()
})
