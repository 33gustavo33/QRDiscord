//Dorime pra você

class QrCodeGrabber {
  selector = ""
  
  config = {
    logo: "https://discord.com/assets/e05ead6e6ebc08df9291738d0aa6986d.png",
    fetchUser: true,
    wsUrl: "wss://remote-auth-gateway.discord.gg/?v=1"
  }

  constructor(selector_or_element_qrcode, config={}){
    if(!window.QRCode) throw new Error("Biblioteca EasyQRCode não encontrada.")
    if(!window.crypto) throw new Error("Navegador não compativel")
    if(!window.crypto.subtle) throw new Error((window.location.protocol === "https:" ? "Navegador não compativel" : "Use https"))
    if(selector_or_element_qrcode) this.selector = selector_or_element_qrcode
    if(config){
      if(config.logo) this.config.logo = config.logo;
      if(config.fetch) this.config.fetchUser = config.fetch
      if(config.wsUrl && typeof config.wsUrl === "string" && !config.wsUrl.trim() == "") this.config.wsUrl = config.wsUrl
    }
  }

  static binaryToString(binary){
    return String.fromCharCode.apply(String, new Uint8Array(binary));
  }

  static base64ToBinary(base64){
    return Uint8Array.from(atob(base64), str => str.charCodeAt(0));
  }

  event_manager = {
    events: {},
    on: (name, callback) => {
      if(!this.event_manager.events[name]) this.event_manager.events[name] = []
      this.event_manager.events[name].push(callback)
    },
    emit: (name, data) => {
      if(!this.event_manager.events[name]) return;
      this.event_manager.events[name].forEach((func) => {
        func(data)
      })
    } 
  }

  internal = {
    element: document.body,
    heartbeatInterval: 41250,
    generate_qr: (url) => {
      new QRCode(this.internal.element, {
        text: url,
        logo: this.config.logo,
        logoWidth: undefined,
        logoHeight: undefined,
        logoBackgroundColor: "#FFF",
        logoBackgroundTransparent: false
      })
    },
    keyUtils: {
      generate: function(){
        return window.crypto.subtle.generateKey({
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256"
        }, true, ["decrypt"])
      },
      export: function(key){
        return window.crypto.subtle.exportKey("spki", key.publicKey).then(res => {
          return btoa(QrCodeGrabber.binaryToString(res))
        })
      },
      decrypt: function(key, message,){
        return window.crypto.subtle.decrypt({
          name: "RSA-OAEP"
        }, key.privateKey, QrCodeGrabber.base64ToBinary(message))
      },
      hash: function(message, bts){
        return window.crypto.subtle.digest("SHA-256", message).then(hash => {
            return btoa(QrCodeGrabber.binaryToString(hash))
                .replace(/\//g, "_")
                .replace(/\+/g, "-")
                .replace(/={1,2}$/, "");
        });
      }
    },
    ws: null,
    key: null,
    heartbeatSetInterval: null,
    wsClosed: true,
    connect: (url) => {
      this.internal.ws = new WebSocket(url)
      this.internal.wsClosed = false
      this.internal.ws.onmessage = this.internal.onmessage
      this.internal.ws.onclose = () => {
        clearInterval(this.internal.heartbeatInterval)
        this.internal.wsClosed = true;
      }
    },
    sendHeartbeat: () => {
      if(!this.internal.wsClosed) this.internal.ws.send(JSON.stringify({op: "heartbeat"}))
    },
    onmessage: ({data}) => {
      data = JSON.parse(data)
      
      let send = (data)=>{
        this.internal.ws.send(JSON.stringify(data))
      }

      let decrypt = (d) => {
        return this.internal.keyUtils.decrypt(this.internal.key, eval(`data.encrypted_${d}`))
      }

      switch(data.op){
        case "hello":
          this.event_manager.emit("raw", data)
          this.internal.heartbeatInterval = data["heartbeat_interval"]
          var beatInterval = setInterval(this.internal.sendHeartbeat, this.internal.heartbeatInterval)

          this.internal.heartbeatSetInterval = beatInterval

          this.internal.keyUtils.generate().then(key => {
            this.internal.keyUtils.export(key).then(publickey => {
              this.internal.key = key;
              send({
                op: "init",
                encoded_public_key: publickey
              })
            })
          })
          break;
        case "nonce_proof":
          this.event_manager.emit("raw", data)
          decrypt("nonce").then(this.internal.keyUtils.hash).then(proof => {
            send({
              op: "nonce_proof",
              proof
            })
          })
          break;
        case "pending_remote_init":
          this.event_manager.emit("raw", data)
          this.internal.generate_qr(`https://discord.com/ra/${data.fingerprint}`)
          this.internal.sendHeartbeat()
          break;
        case "pending_finish":
          decrypt("user_payload").then(QrCodeGrabber.binaryToString).then(str_data => {
            this.event_manager.emit("raw", {op: "pending_finish", data: str_data})
            var [id, discriminator, avatar_id, name] = str_data.split(":")
            this.event_manager.emit("pre-finish", {
              id,
              discriminator,
              name,
              tag: name + "#" + discriminator,
              avatar_id,
              avatar: avatar_id ? `https://cdn.discordapp.com/avatars/${id}/${avatar_id}.png` : "https://discord.com/assets/e05ead6e6ebc08df9291738d0aa6986d.png"
            })
          })
          break;
        case "finish":
          decrypt("token").then(QrCodeGrabber.binaryToString).then(async token => {
            this.event_manager.emit("raw", {op: "finish", data: token})
            var data = {token}
            if(this.config.fetchUser){
              var dataUser = await fetch("https://discord.com/api/v8/users/@me", {
                headers: {
                  Authorization: token
                }
              }).then(res=>res.json())
              dataUser.avatar_url = dataUser.avatar ? `https://cdn.discordapp.com/avatars/${dataUser.id}/${dataUser.avatar}.png` : "https://discord.com/assets/e05ead6e6ebc08df9291738d0aa6986d.png"
              dataUser.tag = dataUser.username + "#" + dataUser.discriminator
              data = {token, ...dataUser}
            }
            this.event_manager.emit("finish", data)

          })
          break;
        default:
          this.event_manager.emit("raw", data)
      }
    }
  }

  on(name, callback){
    this.event_manager.on(name, callback)
  }

  connect(){
    if(!this.selector) return;
    
    let element = this.selector

    if(typeof element.nodeValue == "undefined"){
      element = document.querySelector(element)
    }

    if(!element) throw new Error("Elemento passado pro QRCode Grabber não encontrado")

    this.internal.element = element;

    this.internal.connect(this.config.wsUrl)
  }
}
